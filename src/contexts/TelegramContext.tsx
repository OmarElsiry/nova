import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TelegramWebApp, TelegramUser } from '@/types/telegram';
import { supabase } from '@/integrations/supabase/client';

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  user: TelegramUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: any;
  isFallbackMode: boolean;
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;
  hapticFeedback: {
    impact: (style?: 'light' | 'medium' | 'heavy') => void;
    notification: (type: 'error' | 'success' | 'warning') => void;
    selection: () => void;
  };
  close: () => void;
  expand: () => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider = ({ children }: { children: ReactNode }) => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Authentication function
  const authenticateUser = async (telegramUser: TelegramUser) => {
    try {
      console.log('=== TELEGRAM AUTH DEBUG ===');
      console.log('Authenticating with Telegram user:', telegramUser);
      
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: {
          telegramData: {
            user: telegramUser
          }
        }
      });

      console.log('Auth function response:', { data, error });

      if (error) {
        console.error('Auth function error:', error);
        throw error;
      }

      if (data?.success && data?.session) {
        console.log('Setting session with complete session object...');
        
        // Set the session with complete session data
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        console.log('Session set successfully:', sessionData);
        console.log('User metadata:', sessionData.user?.user_metadata);
        
        setIsAuthenticated(true);
        return true;
      }
      
      throw new Error('Authentication failed - no token received');
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
      // In fallback mode, allow read-only access
      if (!webApp) {
        console.log('Fallback mode: allowing read-only access');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    }
  };

  useEffect(() => {
    const initTelegram = async () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        setWebApp(tg);
        const telegramUser = tg.initDataUnsafe.user || null;
        setUser(telegramUser);
        setIsReady(true);

        // Authenticate if user exists
        if (telegramUser) {
          await authenticateUser(telegramUser);
        }

        // Set up viewport classes for Telegram
        document.documentElement.style.setProperty('--tg-viewport-height', `${tg.viewportHeight}px`);
        document.documentElement.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
        
        // Apply Telegram theme
        if (tg.themeParams) {
          const root = document.documentElement;
          
          // Map Telegram theme colors to CSS variables
          if (tg.themeParams.bg_color) {
            root.style.setProperty('--tg-bg-color', tg.themeParams.bg_color);
          }
          if (tg.themeParams.text_color) {
            root.style.setProperty('--tg-text-color', tg.themeParams.text_color);
          }
          if (tg.themeParams.button_color) {
            root.style.setProperty('--tg-button-color', tg.themeParams.button_color);
          }
          if (tg.themeParams.button_text_color) {
            root.style.setProperty('--tg-button-text-color', tg.themeParams.button_text_color);
          }
          if (tg.themeParams.secondary_bg_color) {
            root.style.setProperty('--tg-secondary-bg-color', tg.themeParams.secondary_bg_color);
          }
        }

        // Listen for theme changes
        tg.onEvent('themeChanged', () => {
          setWebApp({ ...tg });
        });

        // Listen for viewport changes
        tg.onEvent('viewportChanged', () => {
          document.documentElement.style.setProperty('--tg-viewport-height', `${tg.viewportHeight}px`);
          document.documentElement.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
        });
      } else {
        // Fallback for development/non-Telegram environment
        console.log('Telegram WebApp not available - running in fallback mode');
        setIsFallbackMode(true);
        
        // Enhanced fallback user data with real info
        const fallbackUser: TelegramUser = {
          id: 6213708507,
          first_name: "عضو",
          last_name: "تجريبي",
          username: "demo_user",
          language_code: "ar"
        };
        
        setUser(fallbackUser);
        setIsReady(true);
        
        // Set default theme for fallback mode
        const root = document.documentElement;
        root.style.setProperty('--tg-bg-color', 'hsl(var(--background))');
        root.style.setProperty('--tg-text-color', 'hsl(var(--foreground))');
        root.style.setProperty('--tg-button-color', 'hsl(var(--primary))');
        root.style.setProperty('--tg-button-text-color', 'hsl(var(--primary-foreground))');
        root.style.setProperty('--tg-secondary-bg-color', 'hsl(var(--muted))');
        
        // In fallback mode, consider the user authenticated for read-only features
        setIsAuthenticated(true);
      }
    };

    // Try to init immediately
    initTelegram();

    // Also try after a short delay in case the script is still loading
    const timer = setTimeout(initTelegram, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const showMainButton = (text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    }
  };

  const hideMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
    }
  };

  const showBackButton = (onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  };

  const hideBackButton = () => {
    if (webApp?.BackButton) {
      webApp.BackButton.hide();
    }
  };

  const hapticFeedback = {
    impact: (style: 'light' | 'medium' | 'heavy' = 'medium') => {
      webApp?.HapticFeedback?.impactOccurred(style);
    },
    notification: (type: 'error' | 'success' | 'warning') => {
      webApp?.HapticFeedback?.notificationOccurred(type);
    },
    selection: () => {
      webApp?.HapticFeedback?.selectionChanged();
    }
  };

  const close = () => {
    webApp?.close();
  };

  const expand = () => {
    webApp?.expand();
  };

  const value: TelegramContextType = {
    webApp,
    user,
    isReady,
    isAuthenticated,
    platform: webApp?.platform || (isFallbackMode ? 'web' : 'unknown'),
    colorScheme: webApp?.colorScheme || 'light',
    themeParams: webApp?.themeParams || {},
    isFallbackMode,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    close,
    expand
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};