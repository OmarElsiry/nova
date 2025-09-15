import { supabase } from '@/integrations/supabase/client';
import { WalletManager } from './walletManager';

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  destinationAddress: string;
  userConnectedWallet: string;
}

export interface UserBalance {
  depositedBalance: number;
  availableForWithdrawal: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

export class SecureWithdrawal {
  private static instance: SecureWithdrawal;
  private walletManager: WalletManager;

  private constructor() {
    this.walletManager = WalletManager.getInstance();
  }

  public static getInstance(): SecureWithdrawal {
    if (!SecureWithdrawal.instance) {
      SecureWithdrawal.instance = new SecureWithdrawal();
    }
    return SecureWithdrawal.instance;
  }

  /**
   * Get user's deposited balance (only from their own deposits)
   */
  async getUserDepositedBalance(userId: string): Promise<UserBalance> {
    try {
      // Get user's deposits from transactions table
      const { data: deposits, error: depositsError } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('user_id', userId)
        .eq('transaction_type', 'deposit')
        .eq('status', 'completed');

      if (depositsError) {
        throw new Error(`Failed to fetch deposits: ${depositsError.message}`);
      }

      // Get user's withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('user_id', userId)
        .eq('transaction_type', 'withdrawal')
        .eq('status', 'completed');

      if (withdrawalsError) {
        throw new Error(`Failed to fetch withdrawals: ${withdrawalsError.message}`);
      }

      const totalDeposits = deposits?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
      const totalWithdrawals = withdrawals?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
      const availableForWithdrawal = Math.max(0, totalDeposits - totalWithdrawals);

      return {
        depositedBalance: totalDeposits,
        availableForWithdrawal,
        totalDeposits,
        totalWithdrawals
      };
    } catch (error) {
      console.error('Error getting user deposited balance:', error);
      throw error;
    }
  }

  /**
   * Validate withdrawal request
   */
  async validateWithdrawal(request: WithdrawalRequest): Promise<{
    isValid: boolean;
    reason?: string;
    userBalance?: UserBalance;
  }> {
    try {
      // Check if user exists and is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== request.userId) {
        return {
          isValid: false,
          reason: 'Unauthorized: User not authenticated or ID mismatch'
        };
      }

      // Get user's actual deposited balance
      const userBalance = await this.getUserDepositedBalance(request.userId);

      // Validate withdrawal amount
      if (request.amount <= 0) {
        return {
          isValid: false,
          reason: 'Invalid amount: Must be greater than 0',
          userBalance
        };
      }

      if (request.amount < 0.1) {
        return {
          isValid: false,
          reason: 'Minimum withdrawal amount is 0.1 TON',
          userBalance
        };
      }

      if (request.amount > 10000) {
        return {
          isValid: false,
          reason: 'Maximum withdrawal amount is 10,000 TON',
          userBalance
        };
      }

      // Check if user has sufficient deposited balance
      if (request.amount > userBalance.availableForWithdrawal) {
        return {
          isValid: false,
          reason: `Insufficient deposited balance. Available: ${userBalance.availableForWithdrawal.toFixed(2)} TON`,
          userBalance
        };
      }

      // Validate destination address matches connected wallet
      if (request.destinationAddress !== request.userConnectedWallet) {
        return {
          isValid: false,
          reason: 'Security violation: Destination address must match connected wallet',
          userBalance
        };
      }

      // Validate TON address format
      if (!request.destinationAddress.match(/^[EU]Q[A-Za-z0-9_-]{46}$/)) {
        return {
          isValid: false,
          reason: 'Invalid TON address format',
          userBalance
        };
      }

      return {
        isValid: true,
        userBalance
      };
    } catch (error) {
      console.error('Error validating withdrawal:', error);
      return {
        isValid: false,
        reason: 'Validation error: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  /**
   * Process secure withdrawal
   */
  async processWithdrawal(request: WithdrawalRequest): Promise<{
    success: boolean;
    transactionId?: string;
    message: string;
  }> {
    try {
      // Validate withdrawal
      const validation = await this.validateWithdrawal(request);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.reason || 'Withdrawal validation failed'
        };
      }

      // Create withdrawal transaction record
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: request.userId,
          transaction_type: 'withdrawal',
          amount: request.amount.toString(),
          status: 'pending',
          destination_address: request.destinationAddress,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (txError) {
        throw new Error(`Failed to create transaction record: ${txError.message}`);
      }

      // Log security event
      await this.logSecurityEvent(request.userId, 'withdrawal_initiated', {
        amount: request.amount,
        destinationAddress: request.destinationAddress,
        transactionId: transaction.id,
        availableBalance: validation.userBalance?.availableForWithdrawal
      });

      // Process withdrawal through wallet manager
      try {
        await this.walletManager.processWithdrawal(
          parseInt(request.userId),
          request.amount,
          request.destinationAddress
        );

        // Update transaction status to completed
        await supabase
          .from('transactions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', transaction.id);

        return {
          success: true,
          transactionId: transaction.id,
          message: `Withdrawal of ${request.amount} TON processed successfully`
        };
      } catch (processingError) {
        // Update transaction status to failed
        await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            error_message: processingError instanceof Error ? processingError.message : 'Unknown error'
          })
          .eq('id', transaction.id);

        throw processingError;
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      
      // Log security event for failed withdrawal
      await this.logSecurityEvent(request.userId, 'withdrawal_failed', {
        amount: request.amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Withdrawal processing failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(userId: string, eventType: string, details: any) {
    try {
      await supabase
        .from('security_logs')
        .insert({
          user_id: userId,
          event_type: eventType,
          details: JSON.stringify(details),
          timestamp: new Date().toISOString(),
          ip_address: 'unknown', // Would be populated server-side
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get withdrawal history for user
   */
  async getWithdrawalHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('transaction_type', 'withdrawal')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Failed to fetch withdrawal history: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      return [];
    }
  }
}

export default SecureWithdrawal;
