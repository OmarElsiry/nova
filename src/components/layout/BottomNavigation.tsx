import { Store, Gavel, Activity, Tv, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTelegram } from "@/contexts/TelegramContext";

const BottomNavigation = () => {
  const { t } = useLanguage();
  const { hapticFeedback } = useTelegram();

  const handleNavClick = () => {
    hapticFeedback.selection();
  };
  
  const navItems = [
    { 
      path: "/", 
      label: t('market'), 
      icon: Store 
    },
    { 
      path: "/auctions", 
      label: t('auctions'), 
      icon: Gavel 
    },
    { 
      path: "/activities", 
      label: t('activities'), 
      icon: Activity 
    },
      { 
        path: "/channels", 
        label: t('myChannels'), 
        icon: Tv 
      },
    { 
      path: "/profile", 
      label: t('profile'), 
      icon: User 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 pb-safe-bottom">
      <div className="flex items-center justify-around py-1 sm:py-2 px-2 sm:px-4 max-w-md mx-auto">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-2 px-1 sm:px-3 transition-all duration-200 min-w-0 relative",
                isActive
                  ? "text-primary"
                  : "text-text-muted hover:text-text-primary"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <span className="text-xs font-medium truncate max-w-[60px] sm:max-w-none">{label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 sm:w-6 h-0.5 bg-primary rounded-full animate-fade-in" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;