import { Address } from '@ton/core';

export interface WalletAnalysis {
  address: string;
  isValid: boolean;
  workchain: number;
  addressType: 'wallet' | 'contract' | 'unknown';
  format: 'user-friendly' | 'raw';
  isBounceable: boolean;
  isTestnet: boolean;
}

export interface TransactionInfo {
  hash: string;
  timestamp: number;
  value: string;
  from?: string;
  to?: string;
  type: 'incoming' | 'outgoing';
  message?: string;
}

export class TONAddressAnalyzer {
  private static instance: TONAddressAnalyzer;

  public static getInstance(): TONAddressAnalyzer {
    if (!TONAddressAnalyzer.instance) {
      TONAddressAnalyzer.instance = new TONAddressAnalyzer();
    }
    return TONAddressAnalyzer.instance;
  }

  /**
   * Analyze a TON wallet address
   */
  async analyzeAddress(addressString: string): Promise<WalletAnalysis> {
    try {
      // Parse the address using TON SDK
      const address = Address.parse(addressString);
      
      return {
        address: addressString,
        isValid: true,
        workchain: address.workChain,
        addressType: this.determineAddressType(address),
        format: 'user-friendly',
        isBounceable: address.isBounceable,
        isTestnet: address.isTestOnly
      };
    } catch (error) {
      return {
        address: addressString,
        isValid: false,
        workchain: -1,
        addressType: 'unknown',
        format: 'user-friendly',
        isBounceable: false,
        isTestnet: false
      };
    }
  }

  /**
   * Get transaction history for an address
   */
  async getAddressTransactions(addressString: string, limit: number = 20): Promise<TransactionInfo[]> {
    try {
      const response = await fetch(
        `https://toncenter.com/api/v2/getTransactions?address=${addressString}&limit=${limit}`
      );
      const data = await response.json();

      if (!data.ok || !data.result) {
        return [];
      }

      return data.result.map((tx: any) => ({
        hash: tx.transaction_id.hash,
        timestamp: tx.utime,
        value: tx.in_msg?.value ? (parseInt(tx.in_msg.value) / 1000000000).toString() : '0',
        from: tx.in_msg?.source || 'unknown',
        to: tx.out_msgs?.[0]?.destination || addressString,
        type: tx.in_msg?.value ? 'incoming' : 'outgoing',
        message: tx.in_msg?.message || ''
      }));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  }

  /**
   * Get current balance for an address
   */
  async getAddressBalance(addressString: string): Promise<string> {
    try {
      const response = await fetch(
        `https://toncenter.com/api/v2/getAddressBalance?address=${addressString}`
      );
      const data = await response.json();

      if (!data.ok) {
        return '0';
      }

      // Convert from nano TON to TON
      return (parseInt(data.result) / 1000000000).toString();
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return '0';
    }
  }

  /**
   * Get address information including state
   */
  async getAddressInfo(addressString: string): Promise<any> {
    try {
      const response = await fetch(
        `https://toncenter.com/api/v2/getAddressInformation?address=${addressString}`
      );
      const data = await response.json();

      if (!data.ok) {
        return null;
      }

      return {
        balance: (parseInt(data.result.balance) / 1000000000).toString(),
        state: data.result.state,
        code: data.result.code,
        data: data.result.data,
        lastTransactionId: data.result.last_transaction_id,
        blockId: data.result.block_id,
        syncUtime: data.result.sync_utime
      };
    } catch (error) {
      console.error('Failed to fetch address info:', error);
      return null;
    }
  }

  /**
   * Analyze wallet activity patterns
   */
  async analyzeWalletActivity(addressString: string): Promise<{
    totalTransactions: number;
    firstActivity: number | null;
    lastActivity: number | null;
    totalReceived: string;
    totalSent: string;
    isActive: boolean;
    activityScore: number;
  }> {
    const transactions = await this.getAddressTransactions(addressString, 100);
    
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        firstActivity: null,
        lastActivity: null,
        totalReceived: '0',
        totalSent: '0',
        isActive: false,
        activityScore: 0
      };
    }

    let totalReceived = 0;
    let totalSent = 0;
    const timestamps = transactions.map(tx => tx.timestamp).sort((a, b) => a - b);

    transactions.forEach(tx => {
      const value = parseFloat(tx.value);
      if (tx.type === 'incoming') {
        totalReceived += value;
      } else {
        totalSent += value;
      }
    });

    const now = Math.floor(Date.now() / 1000);
    const lastActivity = Math.max(...timestamps);
    const isActive = (now - lastActivity) < (7 * 24 * 60 * 60); // Active if transaction within 7 days

    // Calculate activity score (0-100)
    const daysSinceLastActivity = (now - lastActivity) / (24 * 60 * 60);
    const activityScore = Math.max(0, 100 - (daysSinceLastActivity * 2));

    return {
      totalTransactions: transactions.length,
      firstActivity: Math.min(...timestamps),
      lastActivity: Math.max(...timestamps),
      totalReceived: totalReceived.toString(),
      totalSent: totalSent.toString(),
      isActive,
      activityScore: Math.round(activityScore)
    };
  }

  /**
   * Check if address might be an exchange or service
   */
  async detectAddressType(addressString: string): Promise<{
    type: 'personal' | 'exchange' | 'service' | 'contract' | 'unknown';
    confidence: number;
    indicators: string[];
  }> {
    const activity = await this.analyzeWalletActivity(addressString);
    const info = await this.getAddressInfo(addressString);
    const indicators: string[] = [];
    let type: 'personal' | 'exchange' | 'service' | 'contract' | 'unknown' = 'unknown';
    let confidence = 0;

    // High transaction volume suggests exchange/service
    if (activity.totalTransactions > 1000) {
      indicators.push('High transaction volume');
      type = 'exchange';
      confidence += 30;
    }

    // Contract code suggests smart contract
    if (info?.code && info.code !== '') {
      indicators.push('Has smart contract code');
      type = 'contract';
      confidence += 40;
    }

    // Large balance suggests service/exchange
    const balance = parseFloat(info?.balance || '0');
    if (balance > 10000) {
      indicators.push('Large balance');
      if (type === 'unknown') type = 'service';
      confidence += 20;
    }

    // Regular activity pattern
    if (activity.isActive && activity.activityScore > 80) {
      indicators.push('High activity score');
      confidence += 10;
    }

    // Default to personal if no strong indicators
    if (type === 'unknown' && activity.totalTransactions > 0) {
      type = 'personal';
      confidence = 50;
    }

    return {
      type,
      confidence: Math.min(confidence, 100),
      indicators
    };
  }

  /**
   * Generate comprehensive wallet report
   */
  async generateWalletReport(addressString: string): Promise<{
    analysis: WalletAnalysis;
    balance: string;
    activity: any;
    addressType: any;
    recentTransactions: TransactionInfo[];
    summary: string;
  }> {
    const [analysis, balance, activity, addressType, recentTransactions] = await Promise.all([
      this.analyzeAddress(addressString),
      this.getAddressBalance(addressString),
      this.analyzeWalletActivity(addressString),
      this.detectAddressType(addressString),
      this.getAddressTransactions(addressString, 10)
    ]);

    const summary = this.generateSummary(analysis, balance, activity, addressType);

    return {
      analysis,
      balance,
      activity,
      addressType,
      recentTransactions,
      summary
    };
  }

  private determineAddressType(address: Address): 'wallet' | 'contract' | 'unknown' {
    // Basic heuristics - in a real implementation, you'd check the contract code
    if (address.workChain === 0) {
      return 'wallet'; // Most user wallets are on workchain 0
    }
    return 'unknown';
  }

  private generateSummary(
    analysis: WalletAnalysis,
    balance: string,
    activity: any,
    addressType: any
  ): string {
    const parts = [];
    
    parts.push(`TON Address: ${analysis.address}`);
    parts.push(`Type: ${addressType.type} (${addressType.confidence}% confidence)`);
    parts.push(`Balance: ${balance} TON`);
    parts.push(`Total Transactions: ${activity.totalTransactions}`);
    
    if (activity.isActive) {
      parts.push(`Status: Active (Score: ${activity.activityScore}/100)`);
    } else {
      parts.push(`Status: Inactive`);
    }

    if (activity.firstActivity) {
      const firstDate = new Date(activity.firstActivity * 1000);
      parts.push(`First Activity: ${firstDate.toLocaleDateString()}`);
    }

    if (addressType.indicators.length > 0) {
      parts.push(`Indicators: ${addressType.indicators.join(', ')}`);
    }

    return parts.join('\n');
  }
}
