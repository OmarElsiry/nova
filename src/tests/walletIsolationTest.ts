import { supabase } from '@/integrations/supabase/client';
import { WalletManager } from '@/lib/walletManager';
import { AIAgent } from '@/lib/aiAgent';
import { EdgeCaseHandler } from '@/lib/edgeCaseHandler';

export interface TestUser {
  id: number;
  username: string;
  firstName: string;
  walletAddress?: string;
  balance?: string;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

export class WalletIsolationTester {
  private static instance: WalletIsolationTester;
  private walletManager: WalletManager;
  private aiAgent: AIAgent;
  private edgeHandler: EdgeCaseHandler;
  private testUsers: TestUser[] = [];

  private constructor() {
    this.walletManager = WalletManager.getInstance();
    this.aiAgent = AIAgent.getInstance();
    this.edgeHandler = EdgeCaseHandler.getInstance();
  }

  public static getInstance(): WalletIsolationTester {
    if (!WalletIsolationTester.instance) {
      WalletIsolationTester.instance = new WalletIsolationTester();
    }
    return WalletIsolationTester.instance;
  }

  /**
   * Create test users for isolation testing
   */
  async createTestUsers(): Promise<TestResult> {
    try {
      const testUserData = [
        { id: 999001, username: 'testuser1', firstName: 'Alice' },
        { id: 999002, username: 'testuser2', firstName: 'Bob' },
        { id: 999003, username: 'testuser3', firstName: 'Charlie' }
      ];

      for (const userData of testUserData) {
        // Create test user in database
        const { error } = await supabase
          .from('users')
          .upsert({
            id: userData.id,
            username: userData.username,
            first_name: userData.firstName,
            auth_method: 'test'
          });

        if (error && !error.message.includes('duplicate')) {
          throw new Error(`Failed to create test user ${userData.id}: ${error.message}`);
        }

        this.testUsers.push(userData);
      }

      return {
        testName: 'Create Test Users',
        passed: true,
        message: `Created ${testUserData.length} test users successfully`,
        details: { users: this.testUsers }
      };
    } catch (error) {
      return {
        testName: 'Create Test Users',
        passed: false,
        message: `Failed to create test users: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test 1: Verify each user gets their own unique wallet
   */
  async testUniqueWalletCreation(): Promise<TestResult> {
    try {
      const walletAddresses: string[] = [];

      for (const user of this.testUsers) {
        // Mock authentication for test user
        const mockAuth = () => Promise.resolve({ user: user, userId: user.id });
        
        // Create wallet for each user
        try {
          const wallet = await this.walletManager.createUserWallet(user.id);
          walletAddresses.push(wallet.walletAddress);
          user.walletAddress = wallet.walletAddress;
        } catch (error) {
          // Skip if wallet already exists
          if (error instanceof Error && error.message.includes('already has')) {
            const existingWallet = await this.walletManager.getUserPrimaryWallet(user.id);
            if (existingWallet) {
              walletAddresses.push(existingWallet.wallet_address);
              user.walletAddress = existingWallet.wallet_address;
            }
          } else {
            throw error;
          }
        }
      }

      // Verify all addresses are unique
      const uniqueAddresses = new Set(walletAddresses);
      
      if (uniqueAddresses.size !== walletAddresses.length) {
        return {
          testName: 'Unique Wallet Creation',
          passed: false,
          message: 'Duplicate wallet addresses found',
          details: { addresses: walletAddresses }
        };
      }

      return {
        testName: 'Unique Wallet Creation',
        passed: true,
        message: `All ${this.testUsers.length} users have unique wallet addresses`,
        details: { addresses: walletAddresses }
      };
    } catch (error) {
      return {
        testName: 'Unique Wallet Creation',
        passed: false,
        message: `Wallet creation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test 2: Verify users can only access their own wallet data
   */
  async testWalletAccessIsolation(): Promise<TestResult> {
    try {
      const results: any[] = [];

      for (let i = 0; i < this.testUsers.length; i++) {
        const currentUser = this.testUsers[i];
        
        // Test accessing own wallet (should succeed)
        try {
          const ownWallet = await this.walletManager.getUserPrimaryWallet(currentUser.id);
          results.push({
            userId: currentUser.id,
            accessType: 'own_wallet',
            success: !!ownWallet,
            walletAddress: ownWallet?.wallet_address
          });
        } catch (error) {
          results.push({
            userId: currentUser.id,
            accessType: 'own_wallet',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Test accessing other users' wallets (should fail)
        for (let j = 0; j < this.testUsers.length; j++) {
          if (i !== j) {
            const otherUser = this.testUsers[j];
            
            try {
              // This should fail due to authentication middleware
              const otherWallet = await this.walletManager.validateUserWalletAccess(
                currentUser.id, 
                otherUser.walletAddress || ''
              );
              
              results.push({
                userId: currentUser.id,
                targetUserId: otherUser.id,
                accessType: 'cross_user_access',
                success: false, // Should be false for security
                allowed: otherWallet
              });
            } catch (error) {
              results.push({
                userId: currentUser.id,
                targetUserId: otherUser.id,
                accessType: 'cross_user_access',
                success: true, // Success means access was properly denied
                blocked: true
              });
            }
          }
        }
      }

      // Verify isolation worked correctly
      const crossUserAttempts = results.filter(r => r.accessType === 'cross_user_access');
      const blockedAttempts = crossUserAttempts.filter(r => r.success === true);
      
      if (blockedAttempts.length !== crossUserAttempts.length) {
        return {
          testName: 'Wallet Access Isolation',
          passed: false,
          message: 'Some cross-user access attempts were not properly blocked',
          details: { results }
        };
      }

      return {
        testName: 'Wallet Access Isolation',
        passed: true,
        message: `All cross-user access attempts properly blocked (${blockedAttempts.length}/${crossUserAttempts.length})`,
        details: { results }
      };
    } catch (error) {
      return {
        testName: 'Wallet Access Isolation',
        passed: false,
        message: `Access isolation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test 3: Verify AI agent only accesses user's own data
   */
  async testAIAgentIsolation(): Promise<TestResult> {
    try {
      const results: any[] = [];

      for (const user of this.testUsers) {
        // Test AI agent with user context
        try {
          // Mock user context for AI agent
          const userContext = {
            userId: user.id,
            firstName: user.firstName,
            walletAddress: user.walletAddress,
            balance: '0',
            hasWallet: !!user.walletAddress,
            authMethod: 'test'
          };

          // Test balance query
          const balanceResponse = await this.aiAgent.processQuery('What is my balance?');
          
          results.push({
            userId: user.id,
            query: 'balance',
            success: !balanceResponse.error,
            containsUserData: balanceResponse.message.includes(user.firstName || ''),
            message: balanceResponse.message
          });

          // Test cross-user query (should be rejected)
          const crossUserQuery = `Show me user ${this.testUsers[0].id}'s wallet`;
          const crossUserResponse = await this.aiAgent.processQuery(crossUserQuery);
          
          results.push({
            userId: user.id,
            query: 'cross_user',
            success: crossUserResponse.message.includes('only help with your own account'),
            blocked: true,
            message: crossUserResponse.message
          });

        } catch (error) {
          results.push({
            userId: user.id,
            query: 'error',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Verify all cross-user queries were blocked
      const crossUserQueries = results.filter(r => r.query === 'cross_user');
      const blockedQueries = crossUserQueries.filter(r => r.success === true);

      if (blockedQueries.length !== crossUserQueries.length) {
        return {
          testName: 'AI Agent Isolation',
          passed: false,
          message: 'AI agent did not properly block cross-user queries',
          details: { results }
        };
      }

      return {
        testName: 'AI Agent Isolation',
        passed: true,
        message: `AI agent properly isolated user data (${blockedQueries.length}/${crossUserQueries.length} blocked)`,
        details: { results }
      };
    } catch (error) {
      return {
        testName: 'AI Agent Isolation',
        passed: false,
        message: `AI agent isolation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test 4: Verify deposit monitoring only updates correct user
   */
  async testDepositIsolation(): Promise<TestResult> {
    try {
      const results: any[] = [];

      for (const user of this.testUsers) {
        if (!user.walletAddress) continue;

        // Simulate deposit for this user
        const mockDeposit = {
          walletAddress: user.walletAddress,
          transactionHash: `test_tx_${user.id}_${Date.now()}`,
          amount: '1.0',
          fromAddress: 'test_sender',
          blockNumber: 12345
        };

        try {
          // Call deposit monitoring function
          const { data, error } = await supabase.functions.invoke('deposit-monitor', {
            body: mockDeposit
          });

          if (error) {
            throw error;
          }

          // Verify deposit was credited to correct user only
          const { data: userTransactions } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('transaction_hash', mockDeposit.transactionHash);

          results.push({
            userId: user.id,
            depositAmount: mockDeposit.amount,
            success: userTransactions && userTransactions.length === 1,
            correctUser: userTransactions?.[0]?.user_id === user.id,
            transactionCount: userTransactions?.length || 0
          });

        } catch (error) {
          results.push({
            userId: user.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Verify all deposits went to correct users
      const successfulDeposits = results.filter(r => r.success && r.correctUser);
      
      return {
        testName: 'Deposit Isolation',
        passed: successfulDeposits.length === results.length,
        message: `${successfulDeposits.length}/${results.length} deposits correctly isolated`,
        details: { results }
      };
    } catch (error) {
      return {
        testName: 'Deposit Isolation',
        passed: false,
        message: `Deposit isolation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Run all isolation tests
   */
  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.log('Starting wallet isolation tests...');

    // Create test users
    results.push(await this.createTestUsers());

    // Run isolation tests
    results.push(await this.testUniqueWalletCreation());
    results.push(await this.testWalletAccessIsolation());
    results.push(await this.testAIAgentIsolation());
    results.push(await this.testDepositIsolation());

    return results;
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    try {
      for (const user of this.testUsers) {
        // Delete test user wallets
        await supabase
          .from('user_wallets')
          .delete()
          .eq('user_id', user.id);

        // Delete test transactions
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('user_id', user.id);

        // Delete test users
        await supabase
          .from('users')
          .delete()
          .eq('id', user.id);
      }

      console.log('Test data cleaned up successfully');
    } catch (error) {
      console.error('Failed to clean up test data:', error);
    }
  }
}
