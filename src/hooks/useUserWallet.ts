import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WalletManager } from '@/lib/walletManager';
import { NotificationService } from '@/lib/notificationService';

// Type-safe database client wrapper
const dbClient = supabase as any;

export interface UserWallet {
  id: string;
  address: string;
  label: string;
  wallet_type: 'personal' | 'business' | 'savings';
  is_primary: boolean;
  created_at: string;
  balance?: string;
}

export const useUserWallet = () => {
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [primaryWallet, setPrimaryWallet] = useState<UserWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const walletManager = WalletManager.getInstance();
  const notificationService = NotificationService.getInstance();

  /**
   * Load user wallets from database
   */
  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('يرجى تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await dbClient
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Wallet fetch error:', fetchError);
        setError('فشل في تحميل المحافظ');
        setLoading(false);
        return;
      }

      const walletsWithBalance = await Promise.all(
        (data || []).map(async (wallet: any) => {
          try {
            const balance = await walletManager.getUserWalletBalance(parseInt(user.id));
            return { ...wallet, balance };
          } catch {
            return { ...wallet, balance: '0' };
          }
        })
      );

      setWallets(walletsWithBalance);
      
      const primary = walletsWithBalance.find(w => w.is_primary);
      setPrimaryWallet(primary || null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تحميل المحافظ');
      console.error('Error loading wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new wallet for the user
   */
  const createWallet = async (label: string, walletType: 'personal' | 'business' | 'savings' = 'personal'): Promise<UserWallet | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      // Generate new wallet
      const newWallet = await walletManager.createUserWallet(parseInt(user.id));
      
      // Check if this should be the primary wallet (first wallet)
      const isPrimary = wallets.length === 0;

      // Save to database
      const { data, error } = await dbClient
        .from('user_wallets')
        .insert({
          user_id: user.id,
          address: newWallet.walletAddress,
          label,
          wallet_type: walletType,
          is_primary: isPrimary,
          private_key_encrypted: '',
          mnemonic_encrypted: newWallet.mnemonic.join(' ')
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Notify user
      await notificationService.notifyWalletCreated(newWallet.walletAddress, walletType);

      // Reload wallets
      await loadWallets();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في إنشاء المحفظة');
      console.error('Error creating wallet:', err);
      return null;
    }
  };

  /**
   * Set a wallet as primary
   */
  const setPrimaryWalletById = async (walletId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      // First, unset all primary flags
      await dbClient
        .from('user_wallets')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Then set the selected wallet as primary
      const { error } = await dbClient
        .from('user_wallets')
        .update({ is_primary: true })
        .eq('id', walletId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await loadWallets();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تعيين المحفظة الأساسية');
      console.error('Error setting primary wallet:', err);
      return false;
    }
  };

  /**
   * Update wallet label
   */
  const updateWalletLabel = async (walletId: string, newLabel: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      const { error } = await dbClient
        .from('user_wallets')
        .update({ label: newLabel })
        .eq('id', walletId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await loadWallets();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تحديث تسمية المحفظة');
      console.error('Error updating wallet label:', err);
      return false;
    }
  };

  /**
   * Delete a wallet
   */
  const deleteWallet = async (walletId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      const walletToDelete = wallets.find(w => w.id === walletId);
      if (!walletToDelete) {
        throw new Error('المحفظة غير موجودة');
      }

      if (walletToDelete.is_primary && wallets.length > 1) {
        throw new Error('لا يمكن حذف المحفظة الأساسية. يرجى تعيين محفظة أخرى كأساسية أولاً');
      }

      const { error } = await dbClient
        .from('user_wallets')
        .delete()
        .eq('id', walletId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await loadWallets();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في حذف المحفظة');
      console.error('Error deleting wallet:', err);
      return false;
    }
  };

  /**
   * Get deposit address for primary wallet
   */
  const getDepositAddress = (): string | null => {
    return primaryWallet?.address || null;
  };

  /**
   * Refresh wallet balances
   */
  const refreshBalances = async () => {
    if (wallets.length === 0) return;

    try {
      const updatedWallets = await Promise.all(
        wallets.map(async (wallet) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const balance = await walletManager.getUserWalletBalance(parseInt(user.id));
              return { ...wallet, balance };
            }
            return wallet;
          } catch {
            return wallet; // Keep existing balance on error
          }
        })
      );

      setWallets(updatedWallets);
      
      const primary = updatedWallets.find(w => w.is_primary);
      setPrimaryWallet(primary || null);
    } catch (err) {
      console.error('Error refreshing balances:', err);
    }
  };

  // Load wallets on mount
  useEffect(() => {
    loadWallets();
  }, []);

  return {
    wallets,
    primaryWallet,
    loading,
    error,
    createWallet,
    setPrimaryWalletById,
    updateWalletLabel,
    deleteWallet,
    getDepositAddress,
    refreshBalances,
    reloadWallets: loadWallets
  };
};
