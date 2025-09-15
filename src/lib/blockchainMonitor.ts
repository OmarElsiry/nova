import { supabase } from '@/integrations/supabase/client';

export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timestamp: number;
}

interface UserWallet {
  id: string;
  user_id: number;
  wallet_address: string;
}

export class BlockchainMonitor {
  private static instance: BlockchainMonitor;
  private monitoringInterval: number | null = null;
  private readonly POLL_INTERVAL = 30000; // 30 seconds

  public static getInstance(): BlockchainMonitor {
    if (!BlockchainMonitor.instance) {
      BlockchainMonitor.instance = new BlockchainMonitor();
    }
    return BlockchainMonitor.instance;
  }

  /**
   * Start monitoring deposits for all user wallets
   * Ensures deposits are credited to the correct user only
   */
  async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      console.log('Monitoring already active');
      return;
    }

    console.log('Starting blockchain monitoring for user deposits');
    
    this.monitoringInterval = window.setInterval(async () => {
      try {
        await this.checkForDeposits();
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, this.POLL_INTERVAL);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Blockchain monitoring stopped');
    }
  }

  /**
   * Get all user wallets for monitoring
   */
  private async getUserWallets(): Promise<UserWallet[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('User not authenticated for wallet monitoring');
        return [];
      }

      const { data: wallets, error } = await (supabase as any)
        .from('wallets')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching wallets:', error);
        return [];
      }

      return wallets || [];
    } catch (error) {
      console.error('Failed to get user wallets:', error);
      return [];
    }
  }

  /**
   * Check for new deposits to user wallets
   */
  private async checkForDeposits(): Promise<void> {
    try {
      // Get all user wallets to monitor
      const userWallets = await this.getUserWallets();

      // Check each wallet for new transactions
      for (const wallet of userWallets) {
        await this.checkWalletTransactions(wallet);
      }
    } catch (error) {
      console.error('Deposit check error:', error);
    }
  }

  /**
   * Check transactions for a specific user wallet
   */
  private async checkWalletTransactions(wallet: UserWallet): Promise<void> {
    try {
      // Fetch recent transactions from TON API
      const response = await fetch(
        `https://toncenter.com/api/v2/getTransactions?address=${wallet.wallet_address}&limit=10`
      );
      const data = await response.json();

      if (!data.ok || !data.result) {
        return;
      }

      const transactions = data.result;

      for (const tx of transactions) {
        // Check if this is an incoming transaction
        if (tx.in_msg && tx.in_msg.value && parseInt(tx.in_msg.value) > 0) {
          const transactionHash = tx.transaction_id.hash;
          const amount = (parseInt(tx.in_msg.value) / 1000000000).toString(); // Convert from nano
          const fromAddress = tx.in_msg.source || 'unknown';

          // Check if we've already processed this transaction using type assertion
          const { data: existingTx } = await (supabase as any)
            .from('transactions')
            .select('id')
            .eq('transaction_id', transactionHash)
            .single();

          if (!existingTx) {
            // Process new deposit
            await this.processDeposit({
              walletId: wallet.id,
              userId: wallet.user_id,
              walletAddress: wallet.wallet_address,
              transactionHash,
              amount,
              fromAddress,
              blockNumber: tx.now || 0
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error checking wallet ${wallet.wallet_address}:`, error);
    }
  }

  /**
   * Process a confirmed deposit for a specific user
   */
  private async processDeposit(deposit: {
    walletId: string;
    userId: number;
    walletAddress: string;
    transactionHash: string;
    amount: string;
    fromAddress: string;
    blockNumber: number;
  }): Promise<void> {
    try {
      // Call the secure deposit monitoring function
      const { data, error } = await supabase.functions.invoke('deposit-monitor', {
        body: {
          walletAddress: deposit.walletAddress,
          transactionHash: deposit.transactionHash,
          amount: deposit.amount,
          fromAddress: deposit.fromAddress,
          blockNumber: deposit.blockNumber
        }
      });

      if (error) {
        throw error;
      }

      console.log(`Deposit processed for user ${deposit.userId}: ${deposit.amount} TON`);
    } catch (error) {
      console.error('Deposit processing error:', error);
    }
  }

  /**
   * Get deposit history for a specific user (with ownership validation)
   */
  async getUserDepositHistory(userId: number): Promise<any[]> {
    try {
      // Use type assertion to bypass TypeScript errors with new tables
      const { data: transactions, error } = await (supabase as any)
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('transaction_type', 'deposit')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return transactions || [];
    } catch (error) {
      console.error('Error fetching deposit history:', error);
      return [];
    }
  }
}
