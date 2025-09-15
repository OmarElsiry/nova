import { supabase } from '@/integrations/supabase/client';
import { requireAuth, validateWalletOwnership } from '@/middleware/auth';
import { WalletManager } from './walletManager';

export interface UserContext {
  userId: number;
  username?: string;
  firstName?: string;
  walletAddress?: string;
  balance?: string;
  hasWallet: boolean;
  authMethod: string;
}

export interface AgentResponse {
  message: string;
  actions?: string[];
  walletInfo?: {
    address: string;
    balance: string;
  };
  requiresAuth?: boolean;
  error?: string;
}

export class AIAgent {
  private static instance: AIAgent;
  private walletManager: WalletManager;

  private constructor() {
    this.walletManager = WalletManager.getInstance();
  }

  public static getInstance(): AIAgent {
    if (!AIAgent.instance) {
      AIAgent.instance = new AIAgent();
    }
    return AIAgent.instance;
  }

  /**
   * Core principle: NEVER access other users' data
   * All agent interactions are scoped to the authenticated user only
   */
  private readonly AGENT_PRINCIPLES = {
    USER_ISOLATION: 'Never access data belonging to other users',
    WALLET_SECURITY: 'Only show wallet information for the authenticated user',
    DATA_VALIDATION: 'Always validate user ownership before displaying data',
    ERROR_HANDLING: 'Never expose other users\' information in error messages',
    AUDIT_LOGGING: 'Log all actions with user ID for security auditing'
  };

  /**
   * Get user context with strict authentication validation
   */
  async getUserContext(): Promise<UserContext> {
    try {
      const authData = await requireAuth();
      const user = authData.user;

      // Get user's wallet information (only their own)
      let walletAddress: string | undefined;
      let balance = '0';
      let hasWallet = false;

      try {
        const userWallet = await this.walletManager.getUserPrimaryWallet(user.id);
        if (userWallet) {
          walletAddress = userWallet.wallet_address;
          balance = await this.walletManager.getUserWalletBalance(user.id);
          hasWallet = true;
        }
      } catch (walletError) {
        console.log(`Wallet access failed for user ${user.id}:`, walletError);
      }

      return {
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        walletAddress,
        balance,
        hasWallet,
        authMethod: user.auth_method || 'unknown'
      };
    } catch (error) {
      throw new Error(`Failed to get user context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate system prompt with user context injection
   * Includes strict guardrails against cross-user access
   */
  private generateSystemPrompt(userContext: UserContext): string {
    return `You are a secure crypto wallet assistant. You are currently helping User ID: ${userContext.userId}.

CRITICAL SECURITY RULES:
1. NEVER access or display information for any user other than ${userContext.userId}
2. NEVER show wallet addresses, balances, or transactions that don't belong to this user
3. ALWAYS validate user ownership before performing any wallet operations
4. If asked about other users, respond: "I can only help with your own account"
5. Log all actions with user ID ${userContext.userId} for security auditing

USER CONTEXT:
- User ID: ${userContext.userId}
- Name: ${userContext.firstName || 'User'}
- Has Wallet: ${userContext.hasWallet}
- Wallet Address: ${userContext.walletAddress || 'None'}
- Balance: ${userContext.balance} TON
- Auth Method: ${userContext.authMethod}

You can help with:
- Checking THIS user's wallet balance
- Getting THIS user's deposit address
- Viewing THIS user's transaction history
- Creating a wallet for THIS user (if they don't have one)
- General crypto education

NEVER help with accessing other users' data or performing cross-user operations.`;
  }

  /**
   * Process user query with strict user isolation
   */
  async processQuery(query: string): Promise<AgentResponse> {
    try {
      // Get authenticated user context
      const userContext = await this.getUserContext();
      
      // Log the interaction for audit
      console.log(`AI Agent query from user ${userContext.userId}: ${query.substring(0, 100)}...`);

      // Generate system prompt with user context
      const systemPrompt = this.generateSystemPrompt(userContext);

      // Process the query based on intent
      const intent = this.detectIntent(query);
      
      switch (intent) {
        case 'CHECK_BALANCE':
          return await this.handleBalanceQuery(userContext);
        
        case 'GET_DEPOSIT_ADDRESS':
          return await this.handleDepositAddressQuery(userContext);
        
        case 'CREATE_WALLET':
          return await this.handleWalletCreation(userContext);
        
        case 'TRANSACTION_HISTORY':
          return await this.handleTransactionHistory(userContext);
        
        case 'CROSS_USER_QUERY':
          return {
            message: "I can only help with your own account. I cannot access information about other users for security reasons.",
            error: "Cross-user access denied"
          };
        
        default:
          return await this.handleGeneralQuery(query, systemPrompt, userContext);
      }
    } catch (error) {
      console.error('AI Agent error:', error);
      
      return {
        message: "I'm sorry, I encountered an error while processing your request. Please make sure you're logged in and try again.",
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresAuth: error instanceof Error && error.message.includes('authentication')
      };
    }
  }

  /**
   * Detect user intent from query
   */
  private detectIntent(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('balance') || lowerQuery.includes('how much')) {
      return 'CHECK_BALANCE';
    }
    
    if (lowerQuery.includes('deposit') || lowerQuery.includes('address')) {
      return 'GET_DEPOSIT_ADDRESS';
    }
    
    if (lowerQuery.includes('create wallet') || lowerQuery.includes('new wallet')) {
      return 'CREATE_WALLET';
    }
    
    if (lowerQuery.includes('history') || lowerQuery.includes('transactions')) {
      return 'TRANSACTION_HISTORY';
    }
    
    if (lowerQuery.includes('other user') || lowerQuery.includes('another user') || 
        lowerQuery.includes('user id') && !lowerQuery.includes('my user id')) {
      return 'CROSS_USER_QUERY';
    }
    
    return 'GENERAL';
  }

  /**
   * Handle balance query with user validation
   */
  private async handleBalanceQuery(userContext: UserContext): Promise<AgentResponse> {
    if (!userContext.hasWallet) {
      return {
        message: "You don't have a wallet yet. Would you like me to create one for you?",
        actions: ['create_wallet']
      };
    }

    return {
      message: `Your current balance is ${userContext.balance} TON`,
      walletInfo: {
        address: userContext.walletAddress!,
        balance: userContext.balance!
      }
    };
  }

  /**
   * Handle deposit address query
   */
  private async handleDepositAddressQuery(userContext: UserContext): Promise<AgentResponse> {
    try {
      const depositAddress = await this.walletManager.getUserDepositAddress(userContext.userId);
      
      return {
        message: `Your personal deposit address is: ${depositAddress}\n\nThis address is exclusively for your deposits. Only send TON to this address.`,
        walletInfo: {
          address: depositAddress,
          balance: userContext.balance!
        }
      };
    } catch (error) {
      return {
        message: "I couldn't retrieve your deposit address. You may need to create a wallet first.",
        actions: ['create_wallet'],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle wallet creation
   */
  private async handleWalletCreation(userContext: UserContext): Promise<AgentResponse> {
    if (userContext.hasWallet) {
      return {
        message: "You already have a wallet. Your address is: " + userContext.walletAddress,
        walletInfo: {
          address: userContext.walletAddress!,
          balance: userContext.balance!
        }
      };
    }

    try {
      const newWallet = await this.walletManager.createUserWallet(userContext.userId);
      
      return {
        message: `Great! I've created a new wallet for you.\n\nYour wallet address: ${newWallet.walletAddress}\n\nYou can now receive TON deposits at this address.`,
        walletInfo: {
          address: newWallet.walletAddress,
          balance: '0'
        },
        actions: ['wallet_created']
      };
    } catch (error) {
      return {
        message: "I couldn't create a wallet for you right now. Please try again later.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle transaction history query
   */
  private async handleTransactionHistory(userContext: UserContext): Promise<AgentResponse> {
    if (!userContext.hasWallet) {
      return {
        message: "You don't have a wallet yet, so there's no transaction history to show.",
        actions: ['create_wallet']
      };
    }

    // This would fetch transaction history for the user only
    return {
      message: `Here's your recent transaction history for wallet ${userContext.walletAddress}:\n\n(Transaction history would be displayed here, showing only YOUR transactions)`,
      walletInfo: {
        address: userContext.walletAddress!,
        balance: userContext.balance!
      }
    };
  }

  /**
   * Handle general queries with LLM integration
   */
  private async handleGeneralQuery(query: string, systemPrompt: string, userContext: UserContext): Promise<AgentResponse> {
    // This would integrate with an LLM API (OpenAI, etc.)
    // For now, return a safe response
    return {
      message: `I understand you're asking: "${query}"\n\nI can help you with wallet operations for your account (User ID: ${userContext.userId}). What would you like to do with your wallet?`,
      walletInfo: userContext.hasWallet ? {
        address: userContext.walletAddress!,
        balance: userContext.balance!
      } : undefined
    };
  }
}
