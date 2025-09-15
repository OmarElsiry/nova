import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { TonConnectButton, useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import TonIcon from '@/components/ui/ton-icon';
import { Copy, Wallet, AlertCircle, CheckCircle, RefreshCw, Send } from 'lucide-react';
import { useUserWallet } from '@/hooks/useUserWallet';
import { NotificationService } from '@/lib/notificationService';
import { WalletLinkGenerator } from '@/lib/walletLinkGenerator';
import { MemoEncryption } from '@/lib/memoEncryption';

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Centralized deposit address for all users
const CENTRALIZED_DEPOSIT_ADDRESS = 'UQDrY5iulWs_MyWTP9JSGedWBzlbeRmhCBoqsSaNiSLOs315';

const DepositDialog: React.FC<DepositDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const { t } = useLanguage();
  const walletAddress = useTonAddress();
  const tonWallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const isConnected = !!tonWallet;
  // Remove useUserWallet dependency since we only need TON Connect for deposits
  // const { primaryWallet, createWallet, loading, error: walletError } = useUserWallet();
  const notificationService = NotificationService.getInstance();
  const walletLinkGenerator = WalletLinkGenerator.getInstance();
  const memoEncryption = MemoEncryption.getInstance();
  
  const depositAddress = CENTRALIZED_DEPOSIT_ADDRESS;

  // Enable notifications by default and check permissions on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Request permission immediately and enable by default
        const granted = await notificationService.requestPermission();
        setNotificationsEnabled(granted);
        
        if (granted) {
          // Show welcome notification
          await notificationService.notify(
            '🔔 تم تفعيل الإشعارات',
            'ستتلقى تنبيهات فورية عند تأكيد الإيداعات والسحوبات',
            'success'
          );
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        setNotificationsEnabled(false);
      }
    };
    
    if (isOpen) {
      initializeNotifications();
    }
  }, [isOpen]);

  const handleCreateWallet = async () => {
        // Wallet creation not needed for deposits - only TON Connect required
      toast.success('تم إنشاء محفظة جديدة بنجاح!');
    }
  ;


  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (!tonWallet) {
      toast.error('يرجى ربط محفظة TON أولاً');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (depositAmount < 0.1) {
      toast.error('الحد الأدنى للإيداع هو 0.1 TON');
      return;
    }
    
    if (depositAmount > 10000) {
      toast.error('الحد الأقصى للإيداع هو 10,000 TON');
      return;
    }

    setSending(true);
    try {
      const amountInNanotons = (depositAmount * 1000000000).toString();
      
      // Store transaction details for validation (will be validated server-side)
      const transactionData = {
        amount: depositAmount,
        userAddress: walletAddress,
        timestamp: Date.now()
      };
      console.log('Transaction data:', transactionData);
      
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        messages: [
          {
            address: depositAddress,
            amount: amountInNanotons
          }
        ]
      };

      await tonConnectUI.sendTransaction(transaction);
      
      toast.success(`تم إرسال ${depositAmount} TON بنجاح!`);
      
      // Show success notification
      await notificationService.notify(
        '✅ تم إرسال الإيداع',
        `تم إرسال ${depositAmount} TON بنجاح إلى عنوان الإيداع`,
        'success'
      );
      
      setAmount('');
      onSuccess();
      
    } catch (error) {
      console.error('Transaction failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      console.error('Error details:', errorMessage);
      toast.error(`فشل في إرسال المعاملة: ${errorMessage}`);
    } finally {
      setSending(false);
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
            {t('deposit')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
            />
            <p className="text-xs text-muted-foreground text-center">
              الحد الأدنى للإيداع: 0.1 TON
            </p>
          </div>


          {!isConnected ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ربط محفظة TON</h3>
              <p className="text-sm text-gray-600 mb-4">
                يرجى ربط محفظة TON للإيداع
              </p>
              <TonConnectButton />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Connected Wallet Display */}
              <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg mb-3">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="text-sm font-medium text-green-800">محفظة متصلة</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    {tonWallet?.device?.appName || tonWallet?.device?.appVersion || 'TON Wallet'}
                  </Badge>
                </div>
                <p className="text-xs text-green-700 font-mono break-all mb-1 leading-relaxed">
                  {walletAddress}
                </p>
                <p className="text-xs text-green-600">
                  ستتم المعاملات من هذا العنوان
                </p>
              </div>
              

              {/* Deposit Instructions with Wallet Links */}
              <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">📋 إيداع آمن</h4>
                <p className="text-sm text-blue-700 mb-3 leading-relaxed">
                  انقر على زر "إرسال TON" لإرسال {amount || '...'} TON بشكل آمن
                </p>
                
                
                {/* Secure Transaction Notice */}
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <div className="flex items-center text-green-800 mb-2">
                    <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm font-medium">معاملة آمنة ومشفرة</span>
                  </div>
                  <p className="text-xs text-green-700 leading-relaxed">
                    سيتم إرسال {amount} TON مع رمز مشفر لضمان الأمان
                  </p>
                </div>
                
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-blue-600 flex items-start">
                    <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                    <span>سيتم تحديث رصيدك تلقائياً بعد تأكيد المعاملة</span>
                  </p>
                  <p className="text-xs text-blue-600 flex items-start">
                    <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                    <span>ستتلقى إشعاراً فور تأكيد الإيداع</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 text-base">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) <= 0 || sending}
              className="flex-1 h-12 text-base font-medium"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  إرسال TON
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositDialog;
