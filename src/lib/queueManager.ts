import { supabase } from '@/integrations/supabase/client';
import { AuditLogger } from './auditLogger';

export interface QueueJob {
  id: string;
  user_id: number;
  job_type: string;
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  scheduled_for?: string;
  completed_at?: string;
  error_message?: string;
}

export interface QueueWorkerConfig {
  maxConcurrentJobs: number;
  retryDelayMs: number;
  maxRetries: number;
  jobTimeoutMs: number;
}

export class QueueManager {
  private static instance: QueueManager;
  private auditLogger: AuditLogger;
  private workers: Map<string, QueueWorker> = new Map();
  private isRunning: boolean = false;

  private constructor() {
    this.auditLogger = AuditLogger.getInstance();
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Add job to queue with user isolation
   */
  async addJob(
    userId: number,
    jobType: string,
    payload: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    scheduledFor?: Date
  ): Promise<string> {
    try {
      const jobId = this.generateJobId();
      
      const job: Partial<QueueJob> = {
        id: jobId,
        user_id: userId,
        job_type: jobType,
        payload: {
          ...payload,
          user_scoped: true // Ensure all jobs are user-scoped
        },
        priority,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        scheduled_for: scheduledFor?.toISOString()
      };

      const { error } = await supabase
        .from('job_queue')
        .insert(job);

      if (error) {
        throw new Error(`Failed to add job to queue: ${error.message}`);
      }

      await this.auditLogger.logAuditAction(
        userId,
        'job_queued',
        'queue',
        jobId,
        { job_type: jobType, priority }
      );

      console.log(`[QUEUE] Job ${jobId} added for user ${userId}: ${jobType}`);
      return jobId;
    } catch (error) {
      console.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  /**
   * Process wallet creation jobs with user isolation
   */
  async addWalletCreationJob(userId: number): Promise<string> {
    return this.addJob(
      userId,
      'wallet_creation',
      { user_id: userId },
      'high'
    );
  }

  /**
   * Process deposit monitoring jobs per user
   */
  async addDepositMonitoringJob(
    userId: number,
    walletAddress: string,
    transactionHash?: string
  ): Promise<string> {
    return this.addJob(
      userId,
      'deposit_monitoring',
      {
        user_id: userId,
        wallet_address: walletAddress,
        transaction_hash: transactionHash
      },
      'medium'
    );
  }

  /**
   * Process AI query jobs with user context
   */
  async addAIQueryJob(
    userId: number,
    query: string,
    context: any
  ): Promise<string> {
    return this.addJob(
      userId,
      'ai_query',
      {
        user_id: userId,
        query,
        context: {
          ...context,
          user_scoped: true
        }
      },
      'low'
    );
  }

  /**
   * Process balance update jobs per user
   */
  async addBalanceUpdateJob(
    userId: number,
    walletAddress: string
  ): Promise<string> {
    return this.addJob(
      userId,
      'balance_update',
      {
        user_id: userId,
        wallet_address: walletAddress
      },
      'medium'
    );
  }

  /**
   * Get user's jobs (with ownership validation)
   */
  async getUserJobs(
    userId: number,
    status?: string,
    limit: number = 50
  ): Promise<QueueJob[]> {
    try {
      let query = supabase
        .from('job_queue')
        .select('*')
        .eq('user_id', userId) // Only get jobs for this user
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get user jobs: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user jobs:', error);
      return [];
    }
  }

  /**
   * Cancel user job (with ownership validation)
   */
  async cancelUserJob(userId: number, jobId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('job_queue')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', userId) // Ensure user owns this job
        .eq('status', 'pending'); // Can only cancel pending jobs

      if (error) {
        throw new Error(`Failed to cancel job: ${error.message}`);
      }

      await this.auditLogger.logAuditAction(
        userId,
        'job_cancelled',
        'queue',
        jobId
      );

      return true;
    } catch (error) {
      console.error('Failed to cancel job:', error);
      return false;
    }
  }

  /**
   * Start queue processing
   */
  async startProcessing(config: Partial<QueueWorkerConfig> = {}): Promise<void> {
    if (this.isRunning) {
      console.log('[QUEUE] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[QUEUE] Starting queue processing');

    const defaultConfig: QueueWorkerConfig = {
      maxConcurrentJobs: 5,
      retryDelayMs: 5000,
      maxRetries: 3,
      jobTimeoutMs: 30000,
      ...config
    };

    // Start workers for different job types
    this.workers.set('wallet_creation', new QueueWorker('wallet_creation', defaultConfig));
    this.workers.set('deposit_monitoring', new QueueWorker('deposit_monitoring', defaultConfig));
    this.workers.set('ai_query', new QueueWorker('ai_query', defaultConfig));
    this.workers.set('balance_update', new QueueWorker('balance_update', defaultConfig));

    // Start all workers
    for (const worker of this.workers.values()) {
      worker.start();
    }
  }

  /**
   * Stop queue processing
   */
  async stopProcessing(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[QUEUE] Stopping queue processing');
    this.isRunning = false;

    // Stop all workers
    for (const worker of this.workers.values()) {
      await worker.stop();
    }

    this.workers.clear();
  }

  /**
   * Get queue statistics per user
   */
  async getUserQueueStats(userId: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('job_queue')
        .select('status, job_type')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        byType: {} as any
      };

      data?.forEach(job => {
        stats[job.status as keyof typeof stats]++;
        stats.byType[job.job_type] = (stats.byType[job.job_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Queue worker for processing specific job types
 */
class QueueWorker {
  private jobType: string;
  private config: QueueWorkerConfig;
  private isRunning: boolean = false;
  private processingJobs: Set<string> = new Set();
  private auditLogger: AuditLogger;

  constructor(jobType: string, config: QueueWorkerConfig) {
    this.jobType = jobType;
    this.config = config;
    this.auditLogger = AuditLogger.getInstance();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(`[WORKER] Starting ${this.jobType} worker`);

    // Start processing loop
    this.processLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log(`[WORKER] Stopping ${this.jobType} worker`);

    // Wait for current jobs to finish
    while (this.processingJobs.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        if (this.processingJobs.size >= this.config.maxConcurrentJobs) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const job = await this.getNextJob();
        if (job) {
          this.processJob(job);
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`[WORKER] ${this.jobType} processing error:`, error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async getNextJob(): Promise<QueueJob | null> {
    try {
      const { data, error } = await supabase
        .from('job_queue')
        .select('*')
        .eq('job_type', this.jobType)
        .eq('status', 'pending')
        .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get next job:', error);
      return null;
    }
  }

  private async processJob(job: QueueJob): Promise<void> {
    this.processingJobs.add(job.id);

    try {
      // Mark job as processing
      await this.updateJobStatus(job.id, 'processing');

      // Process job based on type
      await this.executeJob(job);

      // Mark as completed
      await this.updateJobStatus(job.id, 'completed', undefined, new Date().toISOString());

      await this.auditLogger.logAuditAction(
        job.user_id,
        'job_completed',
        'queue',
        job.id,
        { job_type: job.job_type }
      );

    } catch (error) {
      console.error(`[WORKER] Job ${job.id} failed:`, error);

      const attempts = job.attempts + 1;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (attempts >= job.max_attempts) {
        await this.updateJobStatus(job.id, 'failed', errorMessage);
        
        await this.auditLogger.logAuditAction(
          job.user_id,
          'job_failed',
          'queue',
          job.id,
          { job_type: job.job_type, error: errorMessage }
        );
      } else {
        await this.updateJobStatus(job.id, 'retrying', errorMessage);
        
        // Schedule retry
        const retryAt = new Date(Date.now() + this.config.retryDelayMs);
        await supabase
          .from('job_queue')
          .update({
            status: 'pending',
            attempts,
            scheduled_for: retryAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  private async executeJob(job: QueueJob): Promise<void> {
    // Validate user scoping
    if (!job.payload.user_scoped || job.payload.user_id !== job.user_id) {
      throw new Error('Job payload validation failed: user scoping required');
    }

    switch (job.job_type) {
      case 'wallet_creation':
        await this.processWalletCreation(job);
        break;
      case 'deposit_monitoring':
        await this.processDepositMonitoring(job);
        break;
      case 'ai_query':
        await this.processAIQuery(job);
        break;
      case 'balance_update':
        await this.processBalanceUpdate(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }
  }

  private async processWalletCreation(job: QueueJob): Promise<void> {
    // Implementation would call WalletManager.createUserWallet
    console.log(`Processing wallet creation for user ${job.user_id}`);
  }

  private async processDepositMonitoring(job: QueueJob): Promise<void> {
    // Implementation would call blockchain monitoring
    console.log(`Processing deposit monitoring for user ${job.user_id}`);
  }

  private async processAIQuery(job: QueueJob): Promise<void> {
    // Implementation would call AI agent
    console.log(`Processing AI query for user ${job.user_id}`);
  }

  private async processBalanceUpdate(job: QueueJob): Promise<void> {
    // Implementation would update wallet balance
    console.log(`Processing balance update for user ${job.user_id}`);
  }

  private async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string,
    completedAt?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    if (completedAt) {
      updates.completed_at = completedAt;
    }

    await supabase
      .from('job_queue')
      .update(updates)
      .eq('id', jobId);
  }
}
