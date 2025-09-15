import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';

export interface Wallet {
  id: string;
  user_id: number;
  balance: number;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useTelegram();

  const fetchWallet = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Create wallet if doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert([{ user_id: user.id, balance: 0 }])
          .select()
          .single();

        if (createError) throw createError;
        setWallet(newWallet);
      } else {
        setWallet(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async (newBalance: number) => {
    if (!wallet) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id)
        .select()
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [user?.id]);

  return {
    wallet,
    loading,
    error,
    refetch: fetchWallet,
    updateBalance
  };
};