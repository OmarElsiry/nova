import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import TonIcon from '@/components/ui/ton-icon';
import { CheckCircle, AlertCircle, Wallet, Copy } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { NotificationService } from '@/lib/notificationService';
import { SecureWithdrawal, UserBalance } from '@/lib/secureWithdrawal';
import { useTelegram } from '@/contexts/TelegramContext';

interface WithdrawDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WithdrawDialog: React.FC<WithdrawDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const secureWithdrawal = SecureWithdrawal.getInstance();
  const { user } = useTelegram();
  const { t } = useLanguage();
  const { wallet } = useWallet();
  const walletAddress = useTonAddress();
  const tonWallet = useTonWallet();
  const isConnected = !!tonWallet;
  const notificationService = NotificationService.getInstance();
  
  // Auto-fill withdrawal address with connected wallet
  const withdrawAddress = walletAddress || '';

  // Initialize notifications and load user balance
  useEffect(() => {
    const initialize = async () => {
      if (!isOpen || !user?.id) return;
      
      try {
        // Initialize notifications
        const granted = await notificationService.requestPermission();
        setNotificationsEnabled(granted);
        
        // Load user's deposited balance
        const balance = await secureWithdrawal.getUserDepositedBalance(user.id.toString());
        setUserBalance(balance);
      } catch (error) {
        console.error('Failed to initialize withdrawal dialog:', error);
        setNotificationsEnabled(false);
        setUserBalance(null);
      }
    };
    
    initialize();
  }, [isOpen, user?.id]);

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      
      // Comprehensive validation
      const withdrawAmount = parseFloat(amount);
      if (isNaN(withdrawAmount)) {
        toast.error('يرجى إدخال مبلغ صحيح');
        return;
      }
      
      if (withdrawAmount <= 0) {
        toast.error('يجب أن يكون مبلغ السحب أكبر من صفر');
        return;
      }
      
      if (withdrawAmount < 0.1) {
        toast.error('الحد الأدنى للسحب هو 0.1 TON');
        return;
      }
      
      if (withdrawAmount > 10000) {
        toast.error('الحد الأقصى للسحب هو 10,000 TON');
        return;
      }

      if (!user?.id) {
        toast.error('خطأ في المصادقة. يرجى تسجيل الدخول مرة أخرى');
        return;
      }
      
      if (!userBalance) {
        toast.error('لا يمكن تحميل بيانات الرصيد');
        return;
      }
      
      if (withdrawAmount > userBalance.availableForWithdrawal) {
        toast.error(`رصيد غير كافي. الرصيد المتاح للسحب: ${userBalance.availableForWithdrawal.toFixed(2)} TON`);
        return;
      }

      if (!isConnected) {
        toast.error('يرجى ربط محفظة TON أولاً');
        return;
      }

      if (!withdrawAddress) {
        toast.error('لا يمكن العثور على عنوان المحفظة المتصلة');
        return;
      }

      // Validate withdrawal address format
      if (!withdrawAddress.match(/^[EU]Q[A-Za-z0-9_-]{46}$/)) {
        toast.error('عنوان المحفظة غير صحيح');
        return;
      }

      // Process secure withdrawal
      const withdrawalResult = await secureWithdrawal.processWithdrawal({
        userId: user.id.toString(),
        amount: withdrawAmount,
        destinationAddress: withdrawAddress,
        userConnectedWallet: withdrawAddress
      });
      
      if (!withdrawalResult.success) {
        toast.error(withdrawalResult.message);
        return;
      }
      
      toast.success(`تم إرسال ${withdrawAmount} TON بنجاح إلى محفظتك`);
      
      // Send notification
      if (notificationsEnabled) {
        await notificationService.notify(
          '✅ تم السحب بنجاح',
          `تم سحب ${withdrawAmount} TON إلى محفظتك المتصلة`,
          'success'
        );
      }
      
      // Refresh user balance
      const updatedBalance = await secureWithdrawal.getUserDepositedBalance(user.id.toString());
      setUserBalance(updatedBalance);
      
      setAmount('');
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('حدث خطأ أثناء معالجة طلب السحب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('تم نسخ العنوان إلى الحافظة');
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TonIcon size="md" />
            {t('withdraw')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">{t('amount')} (TON)</Label>
            <Input
              id="amount"
              type="number"
              min="0.1"
              max="10000"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              className="text-base h-12 text-center"
              disabled={loading}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-2">
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                الرصيد المتاح للسحب: {userBalance?.availableForWithdrawal?.toFixed(2) || '0.00'} TON
              </p>
              <p className="text-xs text-muted-foreground text-center sm:text-right">
                الحد: 0.1 - 10,000 TON
              </p>
            </div>
            {userBalance && (
              <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded text-center leading-relaxed">
                إجمالي الإيداعات: {userBalance.totalDeposits.toFixed(2)} TON<br className="sm:hidden" />
                <span className="hidden sm:inline"> | </span>
                إجمالي السحوبات: {userBalance.totalWithdrawals.toFixed(2)} TON
              </div>
            )}
          </div>

          {/* Notification Status */}
          <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-sm font-medium">🔔 إعدادات الإشعارات</span>
              <Badge variant={notificationsEnabled ? 'default' : 'secondary'} className="text-xs">
                {notificationsEnabled ? 'مفعلة' : 'معطلة'}
              </Badge>
            </div>
            {notificationsEnabled && (
              <div className="flex items-start text-xs text-green-600">
                <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>ستتلقى إشعاراً عند معالجة السحب</span>
              </div>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">يرجى ربط محفظة TON أولاً</p>
              <TonConnectButton />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Connected Wallet Info */}
              <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="text-sm font-medium text-green-800">💼 محفظة السحب</span>
                  <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                    تلقائي
                  </Badge>
                </div>
                <div className="bg-white p-3 rounded border mb-2">
                  <p className="text-xs font-mono break-all text-green-700 leading-relaxed">
                    {withdrawAddress}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-green-600 flex-1">
                    سيتم السحب تلقائياً إلى هذا العنوان
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(withdrawAddress)}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {/* Withdrawal Info */}
              <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-3">📊 تفاصيل السحب</h4>
                <div className="space-y-2 text-xs text-blue-700">
                  <div className="flex justify-between items-center">
                    <span>المبلغ:</span>
                    <span className="font-medium">{amount || '0'} TON</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>رسوم الشبكة:</span>
                    <span>~0.01 TON</span>
                  </div>
                  <div className="flex justify-between items-center font-medium border-t border-blue-200 pt-2">
                    <span>المجموع:</span>
                    <span className="text-sm">{amount ? (parseFloat(amount) + 0.01).toFixed(2) : '0.01'} TON</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 text-base">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={!amount || !withdrawAddress || !isConnected || loading}
              className="flex-1 h-12 text-base font-medium"
            >
              {loading ? 'جاري المعالجة...' : 'تأكيد السحب'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawDialog;
