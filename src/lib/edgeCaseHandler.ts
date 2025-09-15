import { supabase } from '@/integrations/supabase/client';
import { WalletManager } from './walletManager';
import { AIAgent } from './aiAgent';
import { requireAuth } from '@/middleware/auth';

export interface EdgeCaseResult {
  success: boolean;
  message: string;
  action?: string;
  data?: any;
  requiresUserAction?: boolean;
}

export class EdgeCaseHandler {
  private static instance: EdgeCaseHandler;
  private walletManager: WalletManager;
  private aiAgent: AIAgent;

  private constructor() {
    this.walletManager = WalletManager.getInstance();
    this.aiAgent = AIAgent.getInstance();
  }

  public static getInstance(): EdgeCaseHandler {
    if (!EdgeCaseHandler.instance) {
      EdgeCaseHandler.instance = new EdgeCaseHandler();
    }
    return EdgeCaseHandler.instance;
  }

  /**
   * Handle new user onboarding with wallet isolation
   */
  async handleNewUser(userId: number): Promise<EdgeCaseResult> {
    try {
      // Validate authentication
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        return {
          success: false,
          message: 'Unauthorized: Cannot handle onboarding for different user'
        };
      }

      // Check if user already exists
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, wallet_address')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw new Error(`User lookup failed: ${userError.message}`);
      }

      if (!existingUser) {
        return {
          success: false,
          message: 'User not found in system',
          action: 'complete_registration'
        };
      }

      // Check if user has wallet
      const userWallet = await this.walletManager.getUserPrimaryWallet(userId);
      
      if (!userWallet) {
        // Auto-create wallet for new user
        try {
          const newWallet = await this.walletManager.createUserWallet(userId);
          
          return {
            success: true,
            message: `Welcome! I've created a secure wallet for you. Your deposit address: ${newWallet.walletAddress}`,
            action: 'wallet_created',
            data: {
              walletAddress: newWallet.walletAddress,
              walletId: newWallet.walletId
            }
          };
        } catch (walletError) {
          return {
            success: false,
            message: 'Failed to create wallet for new user',
            action: 'manual_wallet_creation',
            requiresUserAction: true
          };
        }
      }

      return {
        success: true,
        message: `Welcome back! Your wallet is ready: ${userWallet.wallet_address}`,
        data: {
          walletAddress: userWallet.wallet_address,
          walletId: userWallet.id
        }
      };

    } catch (error) {
      console.error('New user handling error:', error);
      return {
        success: false,
        message: 'Failed to handle new user onboarding'
      };
    }
  }

  /**
   * Handle pending deposits with user isolation
   */
  async handlePendingDeposits(userId: number): Promise<EdgeCaseResult> {
    try {
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        return {
          success: false,
          message: 'Unauthorized: Cannot check deposits for different user'
        };
      }

      // Get user's pending transactions
      const { data: pendingTxs, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pending deposits: ${error.message}`);
      }

      if (!pendingTxs || pendingTxs.length === 0) {
        return {
          success: true,
          message: 'No pending deposits found',
          data: { pendingCount: 0 }
        };
      }

      // Check each pending transaction
      const updatedTxs = [];
      for (const tx of pendingTxs) {
        try {
          // Verify transaction status on blockchain
          const isConfirmed = await this.checkTransactionStatus(tx.transaction_hash);
          
          if (isConfirmed) {
            // Update transaction status
            await supabase
              .from('wallet_transactions')
              .update({
                status: 'confirmed',
                confirmed_at: new Date().toISOString()
              })
              .eq('id', tx.id)
              .eq('user_id', userId); // Ensure user isolation

            updatedTxs.push(tx);
          }
        } catch (txError) {
          console.error(`Error checking transaction ${tx.transaction_hash}:`, txError);
        }
      }

      return {
        success: true,
        message: `Checked ${pendingTxs.length} pending deposits. ${updatedTxs.length} confirmed.`,
        data: {
          pendingCount: pendingTxs.length - updatedTxs.length,
          confirmedCount: updatedTxs.length
        }
      };

    } catch (error) {
      console.error('Pending deposits handling error:', error);
      return {
        success: false,
        message: 'Failed to check pending deposits'
      };
    }
  }

  /**
   * Handle wallet connection errors with user context
   */
  async handleWalletConnectionError(userId: number, error: string): Promise<EdgeCaseResult> {
    try {
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        return {
          success: false,
          message: 'Unauthorized: Cannot handle wallet errors for different user'
        };
      }

      // Log error for user
      console.log(`Wallet connection error for user ${userId}: ${error}`);

      // Determine error type and provide appropriate response
      if (error.includes('authentication')) {
        return {
          success: false,
          message: 'Authentication failed. Please log in again.',
          action: 'require_login',
          requiresUserAction: true
        };
      }

      if (error.includes('wallet not found')) {
        return {
          success: false,
          message: 'No wallet found. Would you like me to create one for you?',
          action: 'create_wallet',
          requiresUserAction: true
        };
      }

      if (error.includes('insufficient balance')) {
        const userWallet = await this.walletManager.getUserPrimaryWallet(userId);
        return {
          success: false,
          message: `Insufficient balance. Your current balance: ${await this.walletManager.getUserWalletBalance(userId)} TON`,
          action: 'show_deposit_address',
          data: {
            walletAddress: userWallet?.wallet_address
          }
        };
      }

      // Generic error handling
      return {
        success: false,
        message: 'Wallet operation failed. Please try again or contact support.',
        action: 'retry_operation'
      };

    } catch (handlerError) {
      console.error('Error handler failed:', handlerError);
      return {
        success: false,
        message: 'System error occurred. Please contact support.'
      };
    }
  }

  /**
   * Handle session timeout with user isolation
   */
  async handleSessionTimeout(userId: number): Promise<EdgeCaseResult> {
    try {
      // Clear any cached user data for this specific user
      console.log(`Session timeout for user ${userId}`);

      return {
        success: false,
        message: 'Your session has expired. Please log in again to access your wallet.',
        action: 'require_login',
        requiresUserAction: true
      };

    } catch (error) {
      console.error('Session timeout handling error:', error);
      return {
        success: false,
        message: 'Session error occurred. Please refresh and log in again.'
      };
    }
  }

  /**
   * Handle cross-user access attempts (security violation)
   */
  async handleUnauthorizedAccess(requestedUserId: number, actualUserId: number): Promise<EdgeCaseResult> {
    // Log security violation
    console.error(`SECURITY VIOLATION: User ${actualUserId} attempted to access data for user ${requestedUserId}`);

    // Audit log the violation
    try {
      await supabase
        .from('security_logs')
        .insert({
          user_id: actualUserId,
          violation_type: 'unauthorized_access',
          details: `Attempted to access user ${requestedUserId} data`,
          timestamp: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log security violation:', logError);
    }

    return {
      success: false,
      message: 'Access denied. You can only access your own account data.',
      action: 'security_violation'
    };
  }

  /**
   * Handle database connection errors
   */
  async handleDatabaseError(userId: number, operation: string): Promise<EdgeCaseResult> {
    console.error(`Database error for user ${userId} during ${operation}`);

    return {
      success: false,
      message: 'Database temporarily unavailable. Please try again in a moment.',
      action: 'retry_later'
    };
  }

  /**
   * Handle blockchain network errors
   */
  async handleBlockchainError(userId: number, error: string): Promise<EdgeCaseResult> {
    console.error(`Blockchain error for user ${userId}: ${error}`);

    if (error.includes('network')) {
      return {
        success: false,
        message: 'Blockchain network is temporarily unavailable. Please try again later.',
        action: 'retry_later'
      };
    }

    if (error.includes('timeout')) {
      return {
        success: false,
        message: 'Transaction timeout. Your transaction may still be processing.',
        action: 'check_status_later'
      };
    }

    return {
      success: false,
      message: 'Blockchain operation failed. Please try again.',
      action: 'retry_operation'
    };
  }

  /**
   * Check transaction status on blockchain
   */
  private async checkTransactionStatus(transactionHash: string): Promise<boolean> {
    try {
      // This would integrate with TON API to check transaction status
      const response = await fetch(
        `https://toncenter.com/api/v2/getTransaction?hash=${transactionHash}`
      );
      const data = await response.json();
      
      return data.ok && data.result;
    } catch (error) {
      console.error('Transaction status check failed:', error);
      return false;
    }
  }

  /**
   * Comprehensive error recovery for user
   */
  async recoverUserSession(userId: number): Promise<EdgeCaseResult> {
    try {
      // Validate user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, wallet_address')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          success: false,
          message: 'User account not found. Please contact support.',
          action: 'contact_support'
        };
      }

      // Check wallet status
      const userWallet = await this.walletManager.getUserPrimaryWallet(userId);
      
      if (!userWallet) {
        return {
          success: false,
          message: 'Wallet recovery needed. Would you like me to restore your wallet?',
          action: 'wallet_recovery',
          requiresUserAction: true
        };
      }

      // Verify wallet balance
      const balance = await this.walletManager.getUserWalletBalance(userId);

      return {
        success: true,
        message: `Session recovered successfully. Wallet: ${userWallet.wallet_address}, Balance: ${balance} TON`,
        data: {
          walletAddress: userWallet.wallet_address,
          balance
        }
      };

    } catch (error) {
      console.error('Session recovery failed:', error);
      return {
        success: false,
        message: 'Session recovery failed. Please contact support.',
        action: 'contact_support'
      };
    }
  }
}
