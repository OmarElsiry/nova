import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { TelegramLoginWidget } from '@/components/auth/TelegramLoginWidget';
import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTelegram } from '@/contexts/TelegramContext';
import { Eye, Smartphone, Wallet, Bot } from 'lucide-react';

const Login: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { webApp, user: telegramUser } = useTelegram();
  const [selectedMethod, setSelectedMethod] = useState<'telegram' | 'wallet' | 'guest' | null>(null);
  const walletAddress = useTonAddress();
  const tonWallet = useTonWallet();

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleAuthSuccess = (user: any, session: any) => {
    console.log('Authentication successful:', user);
    navigate('/');
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
    setSelectedMethod(null);
  };

  const handleGuestMode = () => {
    // For guest mode, just navigate to main page without authentication
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            مرحباً بك
          </CardTitle>
          <CardDescription>
            اختر طريقة تسجيل الدخول المناسبة لك
          </CardDescription>
          
          {/* Show current environment indicator */}
          {webApp && telegramUser ? (
            <Badge variant="secondary" className="mx-auto">
              <Smartphone className="w-3 h-3 mr-1" />
              تطبيق تيليجرام
            </Badge>
          ) : (
            <Badge variant="outline" className="mx-auto">
              <Eye className="w-3 h-3 mr-1" />
              متصفح الويب
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {!selectedMethod ? (
            <>
              {/* Telegram Login Option */}
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start text-left h-auto p-4"
                onClick={() => setSelectedMethod('telegram')}
              >
                <Bot className="mr-3 h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-semibold">
                    تسجيل الدخول بتيليجرام
                  </div>
                  <div className="text-sm text-muted-foreground">
                    استخدم حسابك في تيليجرام للوصول الكامل
                  </div>
                </div>
              </Button>

              {/* Wallet Login Option */}
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start text-left h-auto p-4"
                onClick={() => setSelectedMethod('wallet')}
              >
                <Wallet className="mr-3 h-5 w-5 text-green-500" />
                <div>
                  <div className="font-semibold">
                    ربط محفظة TON
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ربط المحفظة للتداول والمعاملات
                  </div>
                </div>
              </Button>

              <Separator />

              {/* Guest Mode Option */}
              <Button
                variant="ghost"
                size="lg"
                className="w-full justify-start text-left h-auto p-4"
                onClick={handleGuestMode}
              >
                <Eye className="mr-3 h-5 w-5 text-gray-500" />
                <div>
                  <div className="font-semibold">
                    تصفح كضيف
                  </div>
                  <div className="text-sm text-muted-foreground">
                    استكشف التطبيق بدون تسجيل دخول
                  </div>
                </div>
              </Button>
            </>
          ) : (
            <>
              {/* Show selected authentication method */}
              {selectedMethod === 'telegram' && (
                <TelegramLoginWidget
                  onSuccess={handleAuthSuccess}
                  onError={handleAuthError}
                />
              )}

              {selectedMethod === 'wallet' && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    ربط محفظة TON للتداول والمعاملات
                  </p>
                  <TonConnectButton />
                  {tonWallet && walletAddress && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        تم ربط المحفظة بنجاح!
                      </p>
                      <Button 
                        onClick={() => handleAuthSuccess({ walletAddress }, null)}
                        className="mt-2 w-full"
                      >
                        متابعة
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Back Button */}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setSelectedMethod(null)}
              >
                رجوع
              </Button>
            </>
          )}

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              يمكنك تغيير طريقة تسجيل الدخول لاحقاً من الإعدادات
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;