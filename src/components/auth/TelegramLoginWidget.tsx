import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TelegramLoginWidgetProps {
  onSuccess: (user: any, session: any) => void;
  onError?: (error: string) => void;
  walletAddress?: string;
}

declare global {
  interface Window {
    onTelegramAuth: (user: any) => void;
    TelegramLoginWidget: any;
  }
}

export const TelegramLoginWidget: React.FC<TelegramLoginWidgetProps> = ({
  onSuccess,
  onError,
  walletAddress
}) => {
  const { t } = useLanguage();
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Define the callback function globally
    window.onTelegramAuth = async (authData: any) => {
      try {
        console.log('Telegram auth data received:', authData);
        
        // Call our edge function to process the authentication
        const { data, error } = await supabase.functions.invoke('telegram-widget-auth', {
          body: {
            authData,
            walletAddress
          }
        });

        if (error) {
          console.error('Telegram widget auth error:', error);
          onError?.(error.message || 'فشل في تسجيل الدخول');
          toast.error('فشل في تسجيل الدخول');
          return;
        }

        console.log('Telegram auth successful:', data);
        
        // Set the session in Supabase client
        if (data.session) {
          await supabase.auth.setSession(data.session);
        }

        onSuccess(data.user, data.session);
        toast.success(data.message || 'تم تسجيل الدخول بنجاح');
        
      } catch (error: any) {
        console.error('Telegram auth processing error:', error);
        onError?.(error.message || 'خطأ في معالجة تسجيل الدخول');
        toast.error('خطأ في معالجة تسجيل الدخول');
      }
    };

    // Load Telegram Login Widget script
    if (!scriptLoaded.current && widgetRef.current) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', 'YOUR_BOT_USERNAME'); // Replace with actual bot username
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;
      
      widgetRef.current.appendChild(script);
      scriptLoaded.current = true;
    }

    return () => {
      // Cleanup
      if (window.onTelegramAuth) {
        delete window.onTelegramAuth;
      }
    };
  }, [onSuccess, onError, walletAddress]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          تسجيل الدخول بتيليجرام
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          استخدم حسابك في تيليجرام لتسجيل الدخول
        </p>
      </div>
      
      {/* Telegram Widget Container */}
      <div 
        ref={widgetRef} 
        className="flex justify-center items-center min-h-[50px] p-4 border border-border rounded-lg bg-card"
      />
      
      {/* Fallback Button */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          إذا لم يظهر زر تيليجرام، تأكد من أن JavaScript مفعل
        </p>
      </div>
    </div>
  );
};