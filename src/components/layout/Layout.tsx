import { ReactNode, useEffect } from "react";
import { useTelegram } from "@/contexts/TelegramContext";
import Header from "./Header";
import BottomNavigation from "./BottomNavigation";
import { FallbackIndicator } from "@/components/ui/fallback-indicator";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { webApp, isReady, isFallbackMode } = useTelegram();

  useEffect(() => {
    if (webApp && isReady) {
      // Configure Telegram WebApp
      webApp.ready();
      webApp.expand();
      
      // Set safe area insets from Telegram
      const root = document.documentElement;
      root.style.setProperty('--safe-area-inset-top', '0px');
      root.style.setProperty('--safe-area-inset-bottom', '0px');
      
      // Update height based on Telegram viewport
      root.style.setProperty('--app-height', `${webApp.viewportHeight}px`);
    }
  }, [webApp, isReady]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background telegram-safe-area"
      style={{
        height: webApp ? `${webApp.viewportHeight}px` : '100vh',
        minHeight: webApp ? `${webApp.viewportHeight}px` : '100vh'
      }}
    >
      <Header />
      
      {isFallbackMode && <FallbackIndicator />}
      
      <main className="pb-16 sm:pb-20 min-h-[calc(var(--app-height,100vh)-120px)] sm:min-h-[calc(var(--app-height,100vh)-140px)] overflow-x-hidden px-2 sm:px-4">
        {children}
      </main>
      
      <BottomNavigation />
    </div>
  );
};

export default Layout;