import { supabase } from '@/integrations/supabase/client';
import { AuditLogger } from './auditLogger';

export interface KYCData {
  user_id: number;
  verification_level: 'none' | 'basic' | 'enhanced' | 'full';
  document_type?: string;
  document_number?: string;
  verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  verified_at?: string;
  expires_at?: string;
  verification_provider?: string;
  risk_score?: number;
  compliance_flags?: string[];
}

export interface ComplianceRule {
  id: string;
  rule_type: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  action: 'allow' | 'warn' | 'block' | 'review';
  conditions: any;
  message: string;
}

export interface ComplianceCheck {
  user_id: number;
  rule_id: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  action_taken: string;
  checked_at: string;
}

export class ComplianceManager {
  private static instance: ComplianceManager;
  private auditLogger: AuditLogger;
  private complianceRules: ComplianceRule[] = [];

  private constructor() {
    this.auditLogger = AuditLogger.getInstance();
    this.initializeComplianceRules();
  }

  public static getInstance(): ComplianceManager {
    if (!ComplianceManager.instance) {
      ComplianceManager.instance = new ComplianceManager();
    }
    return ComplianceManager.instance;
  }

  /**
   * Initialize default compliance rules
   */
  private initializeComplianceRules(): void {
    this.complianceRules = [
      {
        id: 'kyc_required',
        rule_type: 'kyc_verification',
        description: 'KYC verification required for wallet operations',
        severity: 'warning',
        action: 'warn',
        conditions: { min_verification_level: 'basic' },
        message: 'Please complete identity verification to access full wallet features.'
      },
      {
        id: 'transaction_limit',
        rule_type: 'transaction_limits',
        description: 'Daily transaction limits based on verification level',
        severity: 'error',
        action: 'block',
        conditions: { 
          unverified_daily_limit: 100,
          basic_daily_limit: 1000,
          enhanced_daily_limit: 10000
        },
        message: 'Transaction limit exceeded. Please verify your identity to increase limits.'
      },
      {
        id: 'suspicious_activity',
        rule_type: 'aml_monitoring',
        description: 'Monitor for suspicious transaction patterns',
        severity: 'critical',
        action: 'review',
        conditions: { 
          rapid_transactions: 10,
          large_amount_threshold: 5000
        },
        message: 'Account flagged for review due to unusual activity patterns.'
      },
      {
        id: 'geo_restrictions',
        rule_type: 'geographical',
        description: 'Geographical restrictions for certain jurisdictions',
        severity: 'error',
        action: 'block',
        conditions: { 
          blocked_countries: ['US', 'CN', 'KP']
        },
        message: 'Service not available in your jurisdiction due to regulatory restrictions.'
      },
      {
        id: 'age_verification',
        rule_type: 'age_check',
        description: 'Minimum age requirement for crypto services',
        severity: 'error',
        action: 'block',
        conditions: { min_age: 18 },
        message: 'You must be at least 18 years old to use cryptocurrency services.'
      }
    ];
  }

  /**
   * Check user compliance status with user isolation
   */
  async checkUserCompliance(
    userId: number,
    operation: string,
    amount?: number
  ): Promise<{ allowed: boolean; warnings: string[]; errors: string[] }> {
    try {
      const warnings: string[] = [];
      const errors: string[] = [];
      let allowed = true;

      // Get user KYC data
      const kycData = await this.getUserKYCData(userId);
      
      // Get user transaction history for AML checks
      const transactionHistory = await this.getUserTransactionHistory(userId);

      // Check each compliance rule
      for (const rule of this.complianceRules) {
        const checkResult = await this.evaluateRule(
          rule,
          userId,
          kycData,
          transactionHistory,
          operation,
          amount
        );

        if (checkResult.status === 'failed') {
          if (rule.action === 'block') {
            allowed = false;
            errors.push(rule.message);
          } else if (rule.action === 'warn') {
            warnings.push(rule.message);
          }

          // Log compliance check
          await this.logComplianceCheck(userId, rule.id, checkResult.status, rule.message, rule.action);
        }
      }

      // Log overall compliance check
      await this.auditLogger.logAuditAction(
        userId,
        'compliance_check',
        'compliance',
        operation,
        {
          allowed,
          warnings_count: warnings.length,
          errors_count: errors.length,
          operation,
          amount
        }
      );

      return { allowed, warnings, errors };
    } catch (error) {
      console.error('Compliance check failed:', error);
      return {
        allowed: false,
        warnings: [],
        errors: ['Compliance check failed. Please try again.']
      };
    }
  }

  /**
   * Get user KYC data with ownership validation
   */
  async getUserKYCData(userId: number): Promise<KYCData | null> {
    try {
      const { data, error } = await supabase
        .from('user_kyc')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get KYC data:', error);
      return null;
    }
  }

  /**
   * Submit KYC data for user
   */
  async submitKYCData(
    userId: number,
    documentType: string,
    documentNumber: string,
    additionalData?: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const kycData: Partial<KYCData> = {
        user_id: userId,
        verification_level: 'basic',
        document_type: documentType,
        document_number: documentNumber,
        verification_status: 'pending',
        verification_provider: 'internal',
        risk_score: 0,
        compliance_flags: []
      };

      const { error } = await supabase
        .from('user_kyc')
        .upsert(kycData);

      if (error) {
        throw error;
      }

      await this.auditLogger.logAuditAction(
        userId,
        'kyc_submitted',
        'kyc',
        undefined,
        { document_type: documentType }
      );

      return {
        success: true,
        message: 'KYC documentation submitted successfully. Verification typically takes 1-3 business days.'
      };
    } catch (error) {
      console.error('KYC submission failed:', error);
      return {
        success: false,
        message: 'Failed to submit KYC documentation. Please try again.'
      };
    }
  }

  /**
   * Get compliance warnings for user
   */
  async getUserComplianceWarnings(userId: number): Promise<string[]> {
    const warnings: string[] = [];

    try {
      const kycData = await this.getUserKYCData(userId);

      // Check KYC status
      if (!kycData || kycData.verification_level === 'none') {
        warnings.push('⚠️ Identity verification required for full access to wallet features.');
      }

      if (kycData?.verification_status === 'expired') {
        warnings.push('⚠️ Your identity verification has expired. Please update your documents.');
      }

      if (kycData?.verification_status === 'rejected') {
        warnings.push('❌ Identity verification was rejected. Please contact support.');
      }

      // Check recent compliance violations
      const { data: recentChecks } = await supabase
        .from('compliance_checks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'warning')
        .gte('checked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      if (recentChecks && recentChecks.length > 0) {
        warnings.push('⚠️ Recent compliance warnings detected. Please review your account status.');
      }

      return warnings;
    } catch (error) {
      console.error('Failed to get compliance warnings:', error);
      return ['⚠️ Unable to check compliance status. Please contact support.'];
    }
  }

  /**
   * Generate safety warnings for crypto operations
   */
  generateSafetyWarnings(operation: string, amount?: number): string[] {
    const warnings: string[] = [];

    // General crypto safety warnings
    warnings.push('🔒 Never share your private keys or seed phrases with anyone.');
    warnings.push('⚠️ Cryptocurrency transactions are irreversible. Double-check all details.');
    warnings.push('🛡️ Only use official wallet applications and websites.');

    // Operation-specific warnings
    if (operation === 'withdrawal' && amount && amount > 1000) {
      warnings.push('💰 Large withdrawal detected. Consider using multiple smaller transactions for security.');
    }

    if (operation === 'deposit') {
      warnings.push('📍 Only send TON to this address. Other cryptocurrencies will be lost.');
      warnings.push('⏱️ Deposits may take 5-15 minutes to appear in your account.');
    }

    // Regulatory warnings
    warnings.push('📋 Cryptocurrency regulations vary by jurisdiction. Ensure compliance with local laws.');
    warnings.push('💸 You may be subject to tax obligations on cryptocurrency transactions.');

    return warnings;
  }

  /**
   * Check if user needs KYC upgrade
   */
  async checkKYCUpgradeRequired(
    userId: number,
    requestedOperation: string,
    amount?: number
  ): Promise<{ required: boolean; currentLevel: string; requiredLevel: string; message: string }> {
    try {
      const kycData = await this.getUserKYCData(userId);
      const currentLevel = kycData?.verification_level || 'none';

      // Define operation requirements
      const requirements: Record<string, { level: string; dailyLimit?: number }> = {
        'deposit': { level: 'none' },
        'withdrawal': { level: 'basic', dailyLimit: 1000 },
        'large_withdrawal': { level: 'enhanced', dailyLimit: 10000 },
        'trading': { level: 'basic' },
        'staking': { level: 'enhanced' }
      };

      let requiredLevel = 'none';
      let required = false;
      let message = '';

      // Determine required level based on operation and amount
      if (amount && amount > 10000) {
        requiredLevel = 'full';
        required = this.getVerificationLevelValue(currentLevel) < this.getVerificationLevelValue(requiredLevel);
        message = 'Enhanced verification required for large transactions (>10,000 TON)';
      } else if (amount && amount > 1000) {
        requiredLevel = 'enhanced';
        required = this.getVerificationLevelValue(currentLevel) < this.getVerificationLevelValue(requiredLevel);
        message = 'Enhanced verification required for transactions >1,000 TON';
      } else if (requirements[requestedOperation]) {
        requiredLevel = requirements[requestedOperation].level;
        required = this.getVerificationLevelValue(currentLevel) < this.getVerificationLevelValue(requiredLevel);
        message = `${requiredLevel} verification required for ${requestedOperation}`;
      }

      return {
        required,
        currentLevel,
        requiredLevel,
        message
      };
    } catch (error) {
      console.error('KYC upgrade check failed:', error);
      return {
        required: true,
        currentLevel: 'unknown',
        requiredLevel: 'basic',
        message: 'Unable to verify compliance status. Please complete identity verification.'
      };
    }
  }

  /**
   * Evaluate compliance rule against user data
   */
  private async evaluateRule(
    rule: ComplianceRule,
    userId: number,
    kycData: KYCData | null,
    transactionHistory: any[],
    operation: string,
    amount?: number
  ): Promise<ComplianceCheck> {
    let status: 'passed' | 'failed' | 'warning' = 'passed';
    let message = '';
    let actionTaken = 'none';

    switch (rule.rule_type) {
      case 'kyc_verification':
        if (!kycData || kycData.verification_level === 'none') {
          status = 'failed';
          message = rule.message;
          actionTaken = rule.action;
        }
        break;

      case 'transaction_limits':
        if (amount) {
          const dailyLimit = this.getDailyLimit(kycData?.verification_level || 'none', rule.conditions);
          if (amount > dailyLimit) {
            status = 'failed';
            message = rule.message;
            actionTaken = rule.action;
          }
        }
        break;

      case 'aml_monitoring':
        const suspiciousActivity = this.detectSuspiciousActivity(transactionHistory, rule.conditions);
        if (suspiciousActivity) {
          status = 'failed';
          message = rule.message;
          actionTaken = rule.action;
        }
        break;
    }

    return {
      user_id: userId,
      rule_id: rule.id,
      status,
      message,
      action_taken: actionTaken,
      checked_at: new Date().toISOString()
    };
  }

  /**
   * Get verification level numeric value for comparison
   */
  private getVerificationLevelValue(level: string): number {
    const levels: Record<string, number> = {
      'none': 0,
      'basic': 1,
      'enhanced': 2,
      'full': 3
    };
    return levels[level] || 0;
  }

  /**
   * Get daily transaction limit based on verification level
   */
  private getDailyLimit(verificationLevel: string, conditions: any): number {
    switch (verificationLevel) {
      case 'none':
        return conditions.unverified_daily_limit || 100;
      case 'basic':
        return conditions.basic_daily_limit || 1000;
      case 'enhanced':
        return conditions.enhanced_daily_limit || 10000;
      case 'full':
        return conditions.full_daily_limit || 100000;
      default:
        return 100;
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  private detectSuspiciousActivity(transactions: any[], conditions: any): boolean {
    if (!transactions || transactions.length === 0) return false;

    // Check for rapid transactions
    const recentTransactions = transactions.filter(tx => 
      new Date(tx.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentTransactions.length > conditions.rapid_transactions) {
      return true;
    }

    // Check for large amounts
    const largeTransactions = transactions.filter(tx => 
      parseFloat(tx.amount) > conditions.large_amount_threshold
    );

    if (largeTransactions.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Get user transaction history for compliance checks
   */
  private async getUserTransactionHistory(userId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Log compliance check result
   */
  private async logComplianceCheck(
    userId: number,
    ruleId: string,
    status: string,
    message: string,
    action: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('compliance_checks')
        .insert({
          user_id: userId,
          rule_id: ruleId,
          status,
          message,
          action_taken: action,
          checked_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log compliance check:', error);
      }
    } catch (error) {
      console.error('Compliance check logging error:', error);
    }
  }
}
