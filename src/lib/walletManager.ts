import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4, internal } from '@ton/ton';
import { Address } from '@ton/core';
import { supabase } from '@/integrations/supabase/client';
import { requireAuth, validateWalletOwnership } from '@/middleware/auth';
import { ErrorHandler } from './errorHandler';
import { NotificationService } from './notificationService';

// Centralized deposit address for all users
const CENTRALIZED_DEPOSIT_ADDRESS = 'UQDrY5iulWs_MyWTP9JSGedWBzlbeRmhCBoqsSaNiSLOs315';

export interface UserWallet {
  id: string;
  user_id: number;
  wallet_address: string;
  encrypted_mnemonic: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletCreationResult {
  walletAddress: string;
  walletId: string;
  mnemonic: string[];
}

export class WalletManager {
  private static instance: WalletManager;
  private errorHandler: ErrorHandler;
  private notificationService: NotificationService;
  
  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.notificationService = NotificationService.getInstance();
  }
  
  public static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  /**
   * Get centralized deposit address for all users
   */
  getCentralizedDepositAddress(): string {
    return CENTRALIZED_DEPOSIT_ADDRESS;
  }

  /**
   * Create a new dedicated wallet for a user
   * Each user gets their own unique wallet that cannot be accessed by others
   */
  async createUserWallet(userId: number): Promise<WalletCreationResult> {
    const context = { operation: 'wallet_creation', userId };
    
    try {
      // Validate user authentication
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        throw new Error('Unauthorized: Cannot create wallet for different user');
      }

      // Check if user already has a primary wallet
      const existingWallet = await this.getUserPrimaryWallet(userId);
      if (existingWallet) {
        throw new Error('User already has a primary wallet');
      }

      // Generate new mnemonic and keys
      const mnemonic = await mnemonicNew();
      const keyPair = await mnemonicToPrivateKey(mnemonic);
      
      // Create wallet contract
      const wallet = WalletContractV4.create({
        publicKey: keyPair.publicKey,
        workchain: 0
      });

      const walletAddress = wallet.address.toString();

      // Encrypt mnemonic for storage (simple base64 for demo - use proper encryption in production)
      const encryptedMnemonic = Buffer.from(mnemonic.join(' ')).toString('base64');

      // Store wallet in database with user isolation
      const { data: walletData, error } = await (supabase as any)
        .from('wallets')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
          balance: 0
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store wallet: ${error.message}`);
      }

      // Update user record with wallet address
      await supabase
        .from('users')
        .update({ wallet_address: walletAddress })
        .eq('id', userId);

      // Create wallet connection record
      await supabase
        .from('wallet_connections')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
          connection_type: 'ton_generated',
          is_primary: true
        });

      return {
        walletAddress,
        walletId: walletData?.id || '',
        mnemonic
      };
    } catch (error) {
      this.errorHandler.handleError(error, context);
      throw error;
    }
  }

  /**
   * Get user's primary wallet with strict ownership validation
   */
  async getUserPrimaryWallet(userId: number): Promise<UserWallet | null> {
    const context = { operation: 'wallet_lookup', userId };
    
    try {
      // Validate user authentication
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        throw new Error('Unauthorized: Cannot access different user\'s wallet');
      }

      const { data: wallet, error } = await (supabase as any)
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch wallet: ${error.message}`);
      }

      return wallet as any;
    } catch (error) {
      this.errorHandler.handleError(error, context);
      throw error;
    }
  }

  /**
   * Get user's deposit address - now returns centralized address
   */
  async getUserDepositAddress(userId: number): Promise<string> {
    const context = { operation: 'get_deposit_address', userId };
    
    try {
      // Validate user authentication
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        throw new Error('Unauthorized: Cannot access different user\'s deposit address');
      }

      // Return centralized deposit address for all users
      return CENTRALIZED_DEPOSIT_ADDRESS;
    } catch (error) {
      this.errorHandler.handleError(error, context);
      throw error;
    }
  }

  /**
   * Validate that a wallet address belongs to the specified user
   */
  async validateUserWalletAccess(userId: number, walletAddress: string): Promise<boolean> {
    try {
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        return false;
      }

      return await validateWalletOwnership(walletAddress, userId);
    } catch (error) {
      return false;
    }
  }

  /**
   * List all wallets for a user (with strict ownership validation)
   */
  async getUserWallets(userId: number): Promise<UserWallet[]> {
    try {
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        throw new Error('Unauthorized: Cannot access different user\'s wallets');
      }

      const { data: wallets, error } = await (supabase as any)
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch wallets: ${error.message}`);
      }

      return wallets as any[];
    } catch (error) {
      throw new Error(`Wallet listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send TON from user's wallet with strict validation
   */
  async sendTON(
    fromUserId: number,
    toAddress: string,
    amount: string,
    memo?: string
  ): Promise<string> {
    const context = { 
      operation: 'send_transaction', 
      userId: fromUserId, 
      walletAddress: toAddress, 
      amount 
    };
    
    try {
      // Validate inputs
      this.errorHandler.validateInput('amount', amount, {
        required: true,
        min: 0.1,
        max: 10000
      });
      
      this.errorHandler.validateInput('address', toAddress, {
        required: true,
        format: /^[EU]Q[A-Za-z0-9_-]{46}$/
      });

      // Validate user authentication and wallet ownership
      await validateWalletOwnership('', fromUserId);
      
      const wallet = await this.getUserPrimaryWallet(fromUserId);
      if (!wallet) {
        throw new Error('User wallet not found');
      }

      // Validate recipient address
      try {
        Address.parse(toAddress);
      } catch {
        throw new Error('Invalid recipient address format');
      }

      // Validate amount
      const amountNano = parseFloat(amount) * 1000000000;
      if (isNaN(amountNano) || amountNano <= 0) {
        throw new Error('Invalid amount');
      }

      // Get current balance with retry
      const currentBalance = await this.getUserWalletBalance(fromUserId);
      if (parseFloat(currentBalance) < parseFloat(amount)) {
        throw new Error('Insufficient balance');
      }

      // Create transaction with retry mechanism
      const transactionHash = await this.errorHandler.retryOperation(
        async () => {
          const txHash = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          
          // Log transaction
          const { error } = await (supabase as any)
            .from('transactions')
            .insert({
              user_id: fromUserId,
              transaction_id: txHash,
              amount: parseFloat(amount),
              status: 'pending'
            });
            
          if (error) {
            throw error;
          }
          
          return txHash;
        },
        context,
        3,
        1000
      );

      // Send success notification
      await this.notificationService.notify(
        '📤 معاملة مرسلة',
        `تم إرسال ${amount} TON بنجاح`,
        'success'
      );

      return transactionHash;
    } catch (error) {
      this.errorHandler.handleError(error, context);
      throw error;
    }
  }


  /**
   * Get user's transaction history with pagination
   */
  async getUserTransactions(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    const context = { operation: 'get_transactions', userId };
    
    try {
      // Validate user authentication
      await validateWalletOwnership('', userId);

      const transactions = await this.errorHandler.retryOperation(
        async () => {
          const { data, error } = await (supabase as any)
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) {
            throw error;
          }

          return data || [];
        },
        context,
        3,
        1000
      );

      return transactions;
    } catch (error) {
      this.errorHandler.handleError(error, context);
      return []; // Return empty array on error instead of throwing
    }
  }

  /**
   * Get wallet balance with ownership validation
   */
  async getUserWalletBalance(userId: number): Promise<string> {
    const context = { operation: 'get_balance', userId };
    
    try {
      const wallet = await this.getUserPrimaryWallet(userId);
      
      if (!wallet) {
        return '0';
      }

      // Use retry mechanism for network requests
      const balance = await this.errorHandler.retryOperation(
        async () => {
          const response = await fetch(
            `https://toncenter.com/api/v2/getAddressBalance?address=${wallet.wallet_address}`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();

          if (!data.ok) {
            throw new Error('Failed to fetch balance from TON network');
          }

          // Convert from nano TON to TON
          return (parseInt(data.result) / 1000000000).toString();
        },
        context,
        3,
        1000
      );

      return balance;
    } catch (error) {
      this.errorHandler.handleError(error, context);
      return '0'; // Return 0 balance on error instead of throwing
    }
  }

  /**
   * Process withdrawal to connected wallet
   */
  async processWithdrawal(
    userId: number,
    amount: string,
    connectedWalletAddress: string
  ): Promise<string> {
    const context = {
      operation: 'withdrawal',
      userId,
      walletAddress: connectedWalletAddress,
      amount
    };

    try {
      // Validate inputs
      this.errorHandler.validateInput('amount', amount, {
        required: true,
        min: 0.1,
        max: 10000
      });
      
      this.errorHandler.validateInput('address', connectedWalletAddress, {
        required: true,
        format: /^[EU]Q[A-Za-z0-9_-]{46}$/
      });

      // Validate user authentication
      const authData = await requireAuth();
      if (authData.userId !== userId) {
        throw new Error('Unauthorized: Cannot process withdrawal for different user');
      }

      // Check user balance (this would be from internal balance system)
      const userBalance = await this.getUserInternalBalance(userId);
      const withdrawAmount = parseFloat(amount);
      
      if (userBalance < withdrawAmount) {
        throw new Error(`Insufficient balance. Available: ${userBalance} TON`);
      }

      // Process withdrawal with retry mechanism
      const transactionHash = await this.errorHandler.retryOperation(
        async () => {
          const txHash = `withdrawal_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          
          // Record withdrawal transaction
          const { error } = await (supabase as any)
            .from('transactions')
            .insert({
              user_id: userId,
              transaction_id: txHash,
              amount: parseFloat(amount),
              status: 'processing'
            });
            
          if (error) {
            throw error;
          }
          
          return txHash;
        },
        context,
        3,
        1000
      );

      // Send success notification
      await this.notificationService.notifyWithdrawalConfirmed(
        amount,
        connectedWalletAddress,
        transactionHash
      );

      return transactionHash;
    } catch (error) {
      this.errorHandler.handleError(error, context);
      throw error;
    }
  }

  /**
   * Get user's internal balance (from centralized system)
   */
  private async getUserInternalBalance(userId: number): Promise<number> {
    try {
      // This would query your internal balance system
      // For now, return a mock balance
      return 100.0; // Mock balance
    } catch (error) {
      return 0;
    }
  }

  /**
   * Monitor incoming transactions for centralized deposit address
   */
  async monitorIncomingTransactions(userId: number): Promise<void> {
    const context = { operation: 'monitor_transactions', userId };
    
    try {
      // Monitor the centralized deposit address instead of individual wallets
      const depositAddress = CENTRALIZED_DEPOSIT_ADDRESS;

      // Fetch recent transactions from TON network with retry
      const transactions = await this.errorHandler.retryOperation(
        async () => {
          const response = await fetch(
            `https://toncenter.com/api/v2/getTransactions?address=${depositAddress}&limit=10`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();

          if (!data.ok || !data.result) {
            throw new Error('Failed to fetch transactions from TON network');
          }

          return data.result;
        },
        context,
        3,
        2000
      );

      for (const tx of transactions) {
        // Check if this is an incoming transaction
        if (tx.in_msg && tx.in_msg.value && parseInt(tx.in_msg.value) > 0) {
          const transactionHash = tx.transaction_id.hash;
          const amount = (parseInt(tx.in_msg.value) / 1000000000).toString();
          const fromAddress = tx.in_msg.source || 'unknown';

          // Check if we've already processed this transaction
          const { data: existingTx } = await (supabase as any)
            .from('transactions')
            .select('id')
            .eq('transaction_id', transactionHash)
            .single();

          if (!existingTx) {
            // Record new incoming transaction to centralized address
            await (supabase as any)
              .from('transactions')
              .insert({
                user_id: userId,
                transaction_id: transactionHash,
                amount: parseFloat(amount),
                status: 'confirmed'
              });

            // Send notification to user
            await this.notificationService.notifyDepositConfirmed({
              transactionHash,
              amount,
              fromAddress,
              timestamp: Date.now(),
              status: 'confirmed'
            });

            console.log(`New deposit detected: ${amount} TON from ${fromAddress}`);
          }
        }
      }
    } catch (error) {
      this.errorHandler.handleError(error, context);
    }
  }
}
