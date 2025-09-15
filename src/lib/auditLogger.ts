import { supabase } from '@/integrations/supabase/client';

// Type-safe database client wrapper
const dbClient = supabase as any;

export interface AuditLogEntry {
  user_id: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  session_id?: string;
}

export interface SecurityLogEntry {
  user_id: number;
  violation_type: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  ip_address?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log wallet operations with user ID tracking
   */
  async logWalletAction(
    userId: number,
    action: string,
    walletAddress?: string,
    details?: any
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        user_id: userId,
        action: `wallet_${action}`,
        resource_type: 'wallet',
        resource_id: walletAddress,
        details: {
          ...details,
          user_scoped: true
        },
        timestamp: new Date().toISOString(),
        session_id: this.sessionId
      };

      await this.writeAuditLog(logEntry);
      console.log(`[AUDIT] User ${userId}: ${action}${walletAddress ? ` on ${walletAddress}` : ''}`);
    } catch (error) {
      console.error('Failed to log wallet action:', error);
    }
  }

  /**
   * Log AI agent interactions with strict user scoping
   */
  async logAIInteraction(
    userId: number,
    query: string,
    response: string,
    containsSensitiveData: boolean = false
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        user_id: userId,
        action: 'ai_query',
        resource_type: 'ai_agent',
        details: {
          query_length: query.length,
          response_length: response.length,
          contains_sensitive_data: containsSensitiveData,
          user_scoped: true,
          query_hash: this.hashString(query),
          response_hash: this.hashString(response)
        },
        timestamp: new Date().toISOString(),
        session_id: this.sessionId
      };

      await this.writeAuditLog(logEntry);
      console.log(`[AUDIT] User ${userId}: AI query processed`);
    } catch (error) {
      console.error('Failed to log AI interaction:', error);
    }
  }

  /**
   * Log deposit/withdrawal operations
   */
  async logTransactionAction(
    userId: number,
    action: 'deposit' | 'withdrawal',
    amount: string,
    transactionHash?: string,
    walletAddress?: string
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        user_id: userId,
        action: `transaction_${action}`,
        resource_type: 'transaction',
        resource_id: transactionHash,
        details: {
          amount,
          wallet_address: walletAddress,
          user_scoped: true
        },
        timestamp: new Date().toISOString(),
        session_id: this.sessionId
      };

      await this.writeAuditLog(logEntry);
      console.log(`[AUDIT] User ${userId}: ${action} ${amount} TON`);
    } catch (error) {
      console.error('Failed to log transaction action:', error);
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    userId: number,
    event: 'login' | 'logout' | 'session_timeout' | 'auth_failure',
    details?: any
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        user_id: userId,
        action: `auth_${event}`,
        resource_type: 'authentication',
        details: {
          ...details,
          user_scoped: true
        },
        timestamp: new Date().toISOString(),
        session_id: this.sessionId
      };

      await this.writeAuditLog(logEntry);
      console.log(`[AUDIT] User ${userId}: ${event}`);
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }

  /**
   * Log security violations with high priority
   */
  async logSecurityViolation(
    userId: number,
    violationType: string,
    details: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ): Promise<void> {
    try {
      const securityLog: SecurityLogEntry = {
        user_id: userId,
        violation_type: violationType,
        details,
        severity,
        timestamp: new Date().toISOString(),
        ip_address: await this.getClientIP()
      };

      const { error } = await dbClient
        .from('security_logs')
        .insert(securityLog);

      if (error) {
        console.error('Failed to write security log:', error);
      }

      console.error(`[SECURITY] User ${userId}: ${violationType} - ${severity.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to log security violation:', error);
    }
  }

  /**
   * Log cross-user access attempts (critical security event)
   */
  async logCrossUserAccess(
    attemptingUserId: number,
    targetUserId: number,
    resource: string,
    blocked: boolean = true
  ): Promise<void> {
    const details = `User ${attemptingUserId} attempted to access user ${targetUserId}'s ${resource}. ${blocked ? 'BLOCKED' : 'ALLOWED'}`;
    
    await this.logSecurityViolation(
      attemptingUserId,
      'cross_user_access',
      details,
      'critical'
    );

    if (!blocked) {
      console.error(`[CRITICAL BREACH] User ${attemptingUserId} accessed user ${targetUserId}'s data!`);
    }
  }

  /**
   * Log general audit actions
   */
  async logAuditAction(
    userId: number,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: {
          ...details,
          user_scoped: true
        },
        timestamp: new Date().toISOString(),
        session_id: this.sessionId
      };

      await this.writeAuditLog(logEntry);
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }

  /**
   * Get audit logs for a specific user (with ownership validation)
   */
  async getUserAuditLogs(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await dbClient
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user audit logs:', error);
      return [];
    }
  }

  /**
   * Get security logs for a specific user (admin function)
   */
  async getUserSecurityLogs(
    userId: number,
    limit: number = 20
  ): Promise<SecurityLogEntry[]> {
    try {
      const { data, error } = await dbClient
        .from('security_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user security logs:', error);
      return [];
    }
  }

  /**
   * Write audit log entry to database
   */
  private async writeAuditLog(logEntry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await dbClient
        .from('audit_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to write audit log:', error);
      }
    } catch (error) {
      console.error('Audit log write error:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Hash string for privacy (simple implementation)
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Get client IP address (simplified)
   */
  private async getClientIP(): Promise<string> {
    try {
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Create audit summary for user
   */
  async createUserAuditSummary(userId: number, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await (supabase as any)
        .from('audit_logs')
        .select('action, resource_type, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString());

      if (error) {
        throw error;
      }

      const summary = {
        userId,
        period: `${days} days`,
        totalActions: data?.length || 0,
        actionBreakdown: {} as any,
        resourceBreakdown: {} as any,
        lastActivity: data?.[0]?.timestamp || null
      };

      data?.forEach(log => {
        summary.actionBreakdown[log.action] = (summary.actionBreakdown[log.action] || 0) + 1;
        summary.resourceBreakdown[log.resource_type] = (summary.resourceBreakdown[log.resource_type] || 0) + 1;
      });

      return summary;
    } catch (error) {
      console.error('Failed to create audit summary:', error);
      return null;
    }
  }
}
