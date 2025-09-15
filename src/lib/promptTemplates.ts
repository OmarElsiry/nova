import { UserContext } from './aiAgent';

export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
  guardrails: string[];
}

export class PromptTemplateManager {
  private static instance: PromptTemplateManager;

  public static getInstance(): PromptTemplateManager {
    if (!PromptTemplateManager.instance) {
      PromptTemplateManager.instance = new PromptTemplateManager();
    }
    return PromptTemplateManager.instance;
  }

  /**
   * Generate secure system prompt with user context injection
   * Includes strict guardrails to prevent cross-user access
   */
  generateSecurePrompt(userContext: UserContext, query: string): PromptTemplate {
    const systemPrompt = `You are a secure cryptocurrency wallet assistant for TON blockchain.

AUTHENTICATED USER CONTEXT:
- User ID: {{userId}}
- Name: {{firstName}}
- Username: {{username}}
- Wallet Status: {{hasWallet}}
- Wallet Address: {{walletAddress}}
- Current Balance: {{balance}} TON
- Authentication Method: {{authMethod}}

CRITICAL SECURITY GUARDRAILS:
1. NEVER access data for any user other than {{userId}}
2. NEVER display wallet information that doesn't belong to user {{userId}}
3. NEVER perform operations on behalf of other users
4. ALWAYS validate user ownership before showing sensitive data
5. If asked about other users, respond: "I can only help with your own account"
6. Log all actions with user ID {{userId}} for security auditing
7. NEVER expose other users' addresses, balances, or transaction data

ALLOWED OPERATIONS FOR USER {{userId}}:
- Check balance for wallet {{walletAddress}}
- Get deposit address for user {{userId}}
- View transaction history for user {{userId}} only
- Create wallet for user {{userId}} if none exists
- Provide general cryptocurrency education
- Help with wallet security best practices

FORBIDDEN OPERATIONS:
- Access any data not belonging to user {{userId}}
- Perform cross-user transactions or queries
- Display aggregated data from multiple users
- Bypass authentication or authorization checks

RESPONSE GUIDELINES:
- Always reference the user by their name: {{firstName}}
- Include relevant wallet information when appropriate
- Provide clear, helpful responses about cryptocurrency
- Include security warnings for irreversible operations
- Suggest next steps when applicable

Remember: You are exclusively helping user {{userId}} ({{firstName}}). Never access or reference data from other users.`;

    const userPrompt = `User {{userId}} ({{firstName}}) is asking: "${query}"

Current user context:
- Has wallet: {{hasWallet}}
- Wallet address: {{walletAddress}}
- Balance: {{balance}} TON

Please provide a helpful response that is scoped only to this user's account and data.`;

    const guardrails = [
      `Only access data for user ${userContext.userId}`,
      `Never show information from other users`,
      `Always validate user ownership`,
      `Include security warnings for sensitive operations`,
      `Log all actions with user ID ${userContext.userId}`,
      `Reject cross-user queries immediately`,
      `Provide personalized responses using user's name`
    ];

    // Replace placeholders with actual user data
    const processedSystemPrompt = this.replacePlaceholders(systemPrompt, userContext);
    const processedUserPrompt = this.replacePlaceholders(userPrompt, { ...userContext, query });

    return {
      systemPrompt: processedSystemPrompt,
      userPrompt: processedUserPrompt,
      guardrails
    };
  }

  /**
   * Replace template placeholders with actual user data
   */
  private replacePlaceholders(template: string, context: any): string {
    let processed = template;
    
    const replacements = {
      '{{userId}}': context.userId?.toString() || 'unknown',
      '{{firstName}}': context.firstName || 'User',
      '{{username}}': context.username || 'N/A',
      '{{hasWallet}}': context.hasWallet ? 'Active wallet' : 'No wallet',
      '{{walletAddress}}': context.walletAddress || 'No wallet address',
      '{{balance}}': context.balance || '0',
      '{{authMethod}}': context.authMethod || 'unknown',
      '{{query}}': context.query || ''
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      processed = processed.replace(new RegExp(placeholder, 'g'), value);
    }

    return processed;
  }

  /**
   * Generate wallet creation prompt template
   */
  generateWalletCreationPrompt(userContext: UserContext): PromptTemplate {
    const systemPrompt = `You are helping user ${userContext.userId} (${userContext.firstName}) create a new TON wallet.

SECURITY REQUIREMENTS:
- Only create wallet for authenticated user ${userContext.userId}
- Provide clear instructions about wallet security
- Explain the importance of keeping seed phrases secure
- Warn about irreversible nature of cryptocurrency transactions

USER CONTEXT:
- User ID: ${userContext.userId}
- Name: ${userContext.firstName}
- Current wallet status: ${userContext.hasWallet ? 'Has wallet' : 'No wallet'}

Provide helpful guidance for wallet creation while maintaining security.`;

    return {
      systemPrompt,
      userPrompt: `Help user ${userContext.userId} create a secure TON wallet.`,
      guardrails: [
        `Only create wallet for user ${userContext.userId}`,
        'Provide security warnings',
        'Explain seed phrase importance',
        'Include backup instructions'
      ]
    };
  }

  /**
   * Generate deposit guidance prompt template
   */
  generateDepositPrompt(userContext: UserContext): PromptTemplate {
    const systemPrompt = `You are providing deposit guidance to user ${userContext.userId} (${userContext.firstName}).

USER'S WALLET INFORMATION:
- Wallet Address: ${userContext.walletAddress || 'No wallet'}
- Current Balance: ${userContext.balance} TON
- User ID: ${userContext.userId}

SECURITY GUIDELINES:
- Only show this user's deposit address
- Warn about sending only TON to this address
- Explain deposit confirmation times
- Provide security best practices

This address is exclusively for user ${userContext.userId}'s deposits.`;

    return {
      systemPrompt,
      userPrompt: `Provide deposit guidance for user ${userContext.userId}'s wallet: ${userContext.walletAddress}`,
      guardrails: [
        `Only show address for user ${userContext.userId}`,
        'Include security warnings',
        'Explain deposit process',
        'Warn about address verification'
      ]
    };
  }

  /**
   * Generate transaction history prompt template
   */
  generateTransactionHistoryPrompt(userContext: UserContext): PromptTemplate {
    const systemPrompt = `You are showing transaction history for user ${userContext.userId} (${userContext.firstName}).

USER CONTEXT:
- User ID: ${userContext.userId}
- Wallet: ${userContext.walletAddress || 'No wallet'}
- Balance: ${userContext.balance} TON

SECURITY RULES:
- Only show transactions for user ${userContext.userId}
- Never display other users' transaction data
- Validate all transaction data belongs to this user
- Provide clear transaction explanations

Show only transactions belonging to user ${userContext.userId}.`;

    return {
      systemPrompt,
      userPrompt: `Show transaction history for user ${userContext.userId}'s wallet.`,
      guardrails: [
        `Only show transactions for user ${userContext.userId}`,
        'Validate transaction ownership',
        'Provide clear explanations',
        'Include transaction security info'
      ]
    };
  }

  /**
   * Generate error handling prompt template
   */
  generateErrorPrompt(userContext: UserContext, error: string): PromptTemplate {
    const systemPrompt = `You are handling an error for user ${userContext.userId} (${userContext.firstName}).

ERROR CONTEXT: ${error}

SECURITY REQUIREMENTS:
- Never expose other users' data in error messages
- Provide helpful guidance without revealing sensitive information
- Suggest appropriate next steps for user ${userContext.userId}
- Maintain user context isolation

Help user ${userContext.userId} resolve the issue safely.`;

    return {
      systemPrompt,
      userPrompt: `Help user ${userContext.userId} resolve this error: ${error}`,
      guardrails: [
        'Never expose other users\' data in errors',
        'Provide safe error messages',
        'Suggest appropriate solutions',
        'Maintain security context'
      ]
    };
  }

  /**
   * Validate prompt security before use
   */
  validatePromptSecurity(prompt: PromptTemplate, userContext: UserContext): boolean {
    const { systemPrompt, userPrompt } = prompt;
    
    // Check that user ID is properly referenced
    if (!systemPrompt.includes(userContext.userId.toString())) {
      console.error('Prompt missing user ID reference');
      return false;
    }

    // Check for potential cross-user references
    const crossUserPatterns = [
      /user\s+\d+(?!\s*\()/i, // "user 123" but not "user 123 (current user)"
      /all\s+users/i,
      /other\s+users/i,
      /every\s+user/i
    ];

    for (const pattern of crossUserPatterns) {
      if (pattern.test(systemPrompt) || pattern.test(userPrompt)) {
        console.error('Prompt contains potential cross-user reference');
        return false;
      }
    }

    return true;
  }
}
