import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  wallet_address?: string;
  auth_method?: string;
  telegram_verified?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMethod, setAuthMethod] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        
        if (session?.user) {
          // Get user data from our users table
          const telegramUserId = session.user.user_metadata?.telegram_user_id;
          
          if (telegramUserId) {
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', telegramUserId)
              .single();
            
            if (!error && userData) {
              setUser(userData);
              setAuthMethod(userData.auth_method || 'telegram');
            }
          }
        } else {
          setUser(null);
          setAuthMethod(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      // The onAuthStateChange will handle setting the user data
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setAuthMethod(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!session?.user) return;
    
    const telegramUserId = session.user.user_metadata?.telegram_user_id;
    
    if (telegramUserId) {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', telegramUserId)
        .single();
      
      if (!error && userData) {
        setUser(userData);
        setAuthMethod(userData.auth_method || 'telegram');
      }
    }
  };

  const linkWallet = async (walletAddress: string) => {
    if (!user) throw new Error('المستخدم غير مسجل الدخول');

    try {
      // Update user with wallet address
      const { data, error } = await supabase
        .from('users')
        .update({ 
          wallet_address: walletAddress,
          auth_method: user.auth_method === 'telegram' ? 'telegram_wallet' : 'wallet'
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Create wallet connection
      await supabase
        .from('wallet_connections')
        .upsert({
          user_id: user.id,
          wallet_address: walletAddress,
          connection_type: 'ton',
          is_primary: true
        });

      setUser(data);
      return data;
    } catch (error: any) {
      console.error('Link wallet error:', error);
      throw error;
    }
  };

  const unlinkWallet = async () => {
    if (!user) throw new Error('المستخدم غير مسجل الدخول');

    try {
      // Remove wallet address from user
      const { data, error } = await supabase
        .from('users')
        .update({ 
          wallet_address: null,
          auth_method: 'telegram'
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Remove wallet connections
      await supabase
        .from('wallet_connections')
        .delete()
        .eq('user_id', user.id);

      setUser(data);
      return data;
    } catch (error: any) {
      console.error('Unlink wallet error:', error);
      throw error;
    }
  };

  const isAuthenticated = !!session && !!user;
  const hasWallet = !!user?.wallet_address;
  const isTelegramAuth = authMethod?.includes('telegram');
  const isWalletAuth = authMethod?.includes('wallet');

  return {
    user,
    session,
    loading,
    authMethod,
    isAuthenticated,
    hasWallet,
    isTelegramAuth,
    isWalletAuth,
    signOut,
    refreshUser,
    linkWallet,
    unlinkWallet
  };
};