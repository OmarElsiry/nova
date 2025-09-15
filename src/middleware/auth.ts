import { supabase } from '@/integrations/supabase/client';
import { AuthUser } from '@/hooks/useAuth';

export interface AuthenticatedRequest {
  user: AuthUser;
  userId: number;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Middleware to validate user authentication and extract user context
 * Ensures every API call is tied to a unique, authenticated user ID
 */
export const requireAuth = async (): Promise<AuthenticatedRequest> => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new AuthenticationError(`Session error: ${sessionError.message}`);
    }
    
    if (!session?.user) {
      throw new AuthenticationError('No active session found');
    }

    // Extract Telegram user ID from session metadata
    const telegramUserId = session.user.user_metadata?.telegram_user_id;
    
    if (!telegramUserId) {
      throw new AuthenticationError('Invalid session: missing user identifier');
    }

    // Fetch user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', telegramUserId)
      .single();

    if (userError) {
      throw new AuthenticationError(`User lookup failed: ${userError.message}`);
    }

    if (!userData) {
      throw new AuthenticationError('User not found in database');
    }

    return {
      user: userData as AuthUser,
      userId: userData.id
    };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new AuthenticationError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Middleware to ensure user has wallet access
 * Validates that the user has proper wallet permissions
 */
export const requireWalletAccess = async (): Promise<AuthenticatedRequest & { hasWallet: boolean }> => {
  const authData = await requireAuth();
  
  // Check if user has wallet connection
  const { data: walletConnections, error: walletError } = await supabase
    .from('wallet_connections')
    .select('*')
    .eq('user_id', authData.userId)
    .eq('is_primary', true);

  if (walletError) {
    throw new AuthorizationError(`Wallet access check failed: ${walletError.message}`);
  }

  return {
    ...authData,
    hasWallet: (walletConnections && walletConnections.length > 0)
  };
};

/**
 * Utility to validate user owns specific wallet address
 * Prevents cross-user wallet access
 */
export const validateWalletOwnership = async (walletAddress: string, userId: number): Promise<boolean> => {
  const { data: walletConnection, error } = await supabase
    .from('wallet_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('wallet_address', walletAddress)
    .single();

  if (error || !walletConnection) {
    return false;
  }

  return true;
};

/**
 * Security guard to prevent cross-user data access
 * Validates that requested resource belongs to authenticated user
 */
export const validateResourceOwnership = async (
  resourceTable: string,
  resourceId: string,
  userId: number,
  ownerField: string = 'owner_id'
): Promise<boolean> => {
  const { data: resource, error } = await supabase
    .from(resourceTable)
    .select(ownerField)
    .eq('id', resourceId)
    .single();

  if (error || !resource) {
    return false;
  }

  return resource[ownerField] === userId;
};
