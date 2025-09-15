import { User, Plus, Minus, Copy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useTelegram } from "@/contexts/TelegramContext";
import TonIcon from "@/components/ui/ton-icon";
import { useWallet } from "@/hooks/useWallet";
import { SecureWithdrawal } from "@/lib/secureWithdrawal";
import DepositDialog from "@/components/wallet/DepositDialog";
import WithdrawDialog from "../wallet/WithdrawDialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TonConnectButton, useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, hapticFeedback } = useTelegram();
  const { wallet, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const [userBalance, setUserBalance] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const secureWithdrawal = SecureWithdrawal.getInstance();
  const walletAddress = useTonAddress();
  const tonWallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const isConnected = !!tonWallet;
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const { toast } = useToast();

  // Fetch user's deposited balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (!user?.id) return;
      
      try {
        setBalanceLoading(true);
        const balance = await secureWithdrawal.getUserDepositedBalance(user.id.toString());
        setUserBalance(balance);
      } catch (error) {
        console.error('Error fetching user balance:', error);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchUserBalance();
  }, [user?.id]);

  // Sync wallet address with database when connection changes
  useEffect(() => {
    const updateWalletAddress = async () => {
      if (!user?.id || !wallet) return;

      try {
        const { error } = await supabase
          .from('wallets')
          .update({ wallet_address: isConnected ? walletAddress : null })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating wallet address:', error);
        } else {
          // Send notification about wallet connection change
          const message = isConnected 
            ? `تم ربط المحفظة بنجاح: ${walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : ''}`
            : 'تم قطع الاتصال مع المحفظة';
          
          try {
            await supabase.functions.invoke('send-telegram-message', {
              body: {
                to: user.id.toString(),
                message: message
              }
            });
          } catch (msgError) {
            console.warn('Could not send Telegram notification:', msgError);
          }
        }
      } catch (err) {
        console.error('Error syncing wallet:', err);
      }
    };

    updateWalletAddress();
  }, [isConnected, walletAddress, user?.id, wallet]);

  const handleProfileClick = () => {
    hapticFeedback.impact('light');
    navigate('/profile');
  };


  const handleDeposit = () => {
    hapticFeedback.impact('light');
    setShowDepositDialog(true);
  };

  const handleWithdraw = () => {
    hapticFeedback.impact('light');
    setShowWithdrawDialog(true);
  };

  const handleWalletSuccess = async () => {
    refetchWallet();
    // Refresh user balance after wallet operations
    if (user?.id) {
      try {
        const balance = await secureWithdrawal.getUserDepositedBalance(user.id.toString());
        setUserBalance(balance);
      } catch (error) {
        console.error('Error refreshing user balance:', error);
      }
    }
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({
        title: "تم نسخ العنوان",
        description: "تم نسخ عنوان المحفظة إلى الحافظة",
      });
      hapticFeedback.impact('light');
    }
  };

  const handleDisconnect = async () => {
    try {
      hapticFeedback.impact('medium');
      await tonConnectUI.disconnect();
      toast({
        title: "تم قطع الاتصال",
        description: "تم قطع الاتصال مع المحفظة بنجاح",
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء قطع الاتصال مع المحفظة",
        variant: "destructive"
      });
    }
  };
  
  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-border px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        {/* Left - User Avatar/Info */}
        <button 
          onClick={handleProfileClick}
          className="flex items-center gap-2 sm:gap-3 hover:bg-primary/10 rounded-xl p-2 sm:p-3 transition-all duration-200 min-w-0 flex-shrink group"
        >
          {user?.photo_url ? (
            <img 
              src={user.photo_url} 
              alt={user.first_name}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
          )}
          {user && (
            <div className="text-left min-w-0 flex-shrink">
              <div className="text-sm sm:text-base font-semibold text-text-primary truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">
                {user.first_name}
              </div>
              {user.username && (
                <div className="text-xs sm:text-sm text-text-muted truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">
                  @{user.username}
                </div>
              )}
            </div>
          )}
        </button>

        {/* Right - Balance and Wallet Actions */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink-0">
          {/* TON Balance - User's Deposited Balance */}
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-text-primary bg-primary/5 rounded-lg px-2 py-1">
            <TonIcon size="sm" className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="min-w-0 truncate font-semibold">
              {balanceLoading ? '...' : (userBalance?.availableForWithdrawal?.toFixed(2) || '0.00')}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">TON</span>
          </div>

          {/* Wallet Actions */}
          {isConnected ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Wallet Address Display */}
              <div className="hidden sm:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 min-w-0">
                <span className="text-xs font-mono text-muted-foreground max-w-[80px] md:max-w-[120px] truncate" title={walletAddress}>
                  {walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : ''}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 flex-shrink-0 hover:bg-primary/10"
                  onClick={handleCopyAddress}
                  title="نسخ العنوان"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Deposit Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 sm:h-10 sm:w-10 p-0 hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-all duration-200 flex-shrink-0"
                  onClick={handleDeposit}
                  title={t('deposit')}
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>

                {/* Withdraw Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 sm:h-10 sm:w-10 p-0 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-200 flex-shrink-0"
                  onClick={handleWithdraw}
                  title={t('withdraw')}
                >
                  <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>

                {/* Disconnect Button - Mobile Only */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 sm:hidden p-0 text-red-500 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                  onClick={handleDisconnect}
                  title="قطع الاتصال"
                >
                  <LogOut className="w-3 h-3" />
                </Button>
                
                {/* Disconnect Button - Desktop */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hidden sm:flex h-10 px-4 text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200 items-center gap-2"
                  onClick={handleDisconnect}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">قطع الاتصال</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Connect Wallet Button */
            <div className="scale-90 sm:scale-100 origin-right">
              <TonConnectButton />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <DepositDialog
        isOpen={showDepositDialog}
        onClose={() => setShowDepositDialog(false)}
        onSuccess={handleWalletSuccess}
      />
      
      <WithdrawDialog
        isOpen={showWithdrawDialog}
        onClose={() => setShowWithdrawDialog(false)}
        onSuccess={handleWalletSuccess}
      />
    </header>
  );
};

export default Header;