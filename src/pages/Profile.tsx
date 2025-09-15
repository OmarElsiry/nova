import { useState } from "react";
import { Users, TrendingUp, ChevronRight, BarChart3, ShoppingCart, ShoppingBag, User, MessageSquare, Megaphone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useTheme, Theme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import TonIcon from "@/components/ui/ton-icon";

const Profile = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showLanguages, setShowLanguages] = useState(false);
  const [showThemes, setShowThemes] = useState(false);

  const languages = [
    { code: 'ar' as Language, name: t('arabic'), flag: '🇮🇶' },
    { code: 'en' as Language, name: t('english'), flag: '🇺🇸' },
    { code: 'ru' as Language, name: t('russian'), flag: '🇷🇺' },
    { code: 'zh' as Language, name: t('chinese'), flag: '🇨🇳' },
    { code: 'fr' as Language, name: t('french'), flag: '🇫🇷' },
    { code: 'de' as Language, name: t('german'), flag: '🇩🇪' },
    { code: 'es' as Language, name: t('spanish'), flag: '🇪🇸' },
  ];

  const ThemeIcon = ({ themeCode }: { themeCode?: Theme }) => {
    const getThemeColor = (theme: Theme) => {
      switch (theme) {
        case 'light': return 'text-gray-600';
        case 'dark': return 'text-gray-300';
        case 'blue': return 'text-blue-500';
        case 'gold': return 'text-yellow-500';
        case 'purple': return 'text-purple-500';
        case 'royal-red': return '#FF4D6D';
        case 'deep-teal': return '#40E0D0';
        case 'blossom-pink': return '#C71585';
        case 'pale-champagne': return '#F5E6CC';
        case 'cocoa-luxe': return '#CD7F32';
        default: return 'text-primary';
      }
    };

    const currentTheme = themeCode || theme;
    const themeColor = getThemeColor(currentTheme);
    const isCustomColor = themeColor.startsWith('#');

    return (
      <div className="w-5 h-5 flex items-center justify-center">
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          className={isCustomColor ? '' : themeColor}
          style={isCustomColor ? { color: themeColor } : {}}
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M12 2a10 10 0 0 1 7.07 2.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M19.07 19.07A10 10 0 0 1 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M4.93 4.93A10 10 0 0 1 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      </div>
    );
  };

  const themes = [
    { code: 'light' as Theme, name: t('lightTheme'), icon: ThemeIcon },
    { code: 'dark' as Theme, name: t('darkTheme'), icon: ThemeIcon },
    { code: 'blue' as Theme, name: t('blueTheme'), icon: ThemeIcon },
    { code: 'gold' as Theme, name: t('goldTheme'), icon: ThemeIcon },
    { code: 'purple' as Theme, name: t('purpleTheme'), icon: ThemeIcon },
    { code: 'royal-red' as Theme, name: t('royalRedTheme'), icon: ThemeIcon },
    { code: 'deep-teal' as Theme, name: t('deepTealTheme'), icon: ThemeIcon },
    { code: 'blossom-pink' as Theme, name: t('blossomPinkTheme'), icon: ThemeIcon },
    { code: 'pale-champagne' as Theme, name: t('paleChampagneTheme'), icon: ThemeIcon },
    { code: 'cocoa-luxe' as Theme, name: t('cocoaLuxeTheme'), icon: ThemeIcon },
  ];

  const statsCards = [
    { icon: BarChart3, label: t('totalVolume'), value: "0", color: "text-primary" },
    { icon: ShoppingCart, label: t('bought'), value: "0", color: "text-success" },
    { icon: ShoppingBag, label: t('sold'), value: "0", color: "text-warning" },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Profile Header */}
      <Card className="bg-surface border-border theme-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center avatar-glow">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">User</h2>
              <p className="text-sm text-text-muted">@user</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 glow-hover"
                onClick={() => window.open('https://t.me/GT_Rolet', '_blank')}
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Channel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 glow-hover"
                onClick={() => window.open('https://t.me/Gifts_Super', '_blank')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="bg-surface border-border theme-shadow hover:theme-glow transition-all duration-300">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-lg font-bold text-text-primary mb-1">
                <div className="flex items-center justify-center gap-1">
                  <span>{stat.value}</span>
                  <TonIcon size="xs" />
                </div>
              </div>
              <p className="text-xs text-text-muted">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings Section */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t('settings')}</h2>
        
        <div className="space-y-3">
          {/* Language Setting */}
          <Card className="bg-surface border-border theme-shadow">
            <CardContent className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto rounded-lg"
                onClick={() => setShowLanguages(!showLanguages)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center theme-glow">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-text-primary">{t('language')}</p>
                    <p className="text-sm text-text-muted">
                      {languages.find(l => l.code === language)?.name}
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-text-muted transition-transform duration-200 ${showLanguages ? 'rotate-90' : ''}`} />
              </Button>
              
              {showLanguages && (
                <div className="mt-4 grid grid-cols-2 gap-2 dropdown-enter">
                  {languages.map((lang) => (
                    <Button
                      key={lang.code}
                      variant={language === lang.code ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLanguages(false);
                      }}
                      className="justify-start transition-all duration-200 hover:scale-105"
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Theme Setting */}
          <Card className="bg-surface border-border theme-shadow">
            <CardContent className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto rounded-lg"
                onClick={() => setShowThemes(!showThemes)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center theme-glow">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-primary"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="12" r="3" fill="currentColor"/>
                      <path d="m8.5 8.5 7 7" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M15.5 8.5l-7 7" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-text-primary">{t('theme')}</p>
                    <p className="text-sm text-text-muted">
                      {themes.find(t => t.code === theme)?.name}
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-text-muted transition-transform duration-200 ${showThemes ? 'rotate-90' : ''}`} />
              </Button>
              
               {showThemes && (
                 <div className="mt-4 grid grid-cols-5 gap-2 dropdown-enter">
                  {themes.map((themeOption) => (
                      <Button
                        key={themeOption.code}
                        variant={theme === themeOption.code ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setTheme(themeOption.code);
                          setShowThemes(false);
                        }}
                        className="flex-col h-16 text-xs p-2 gap-1 transition-all duration-200 hover:scale-105"
                      >
                        <ThemeIcon themeCode={themeOption.code} />
                        <span className="text-xs text-center leading-tight">{themeOption.name}</span>
                      </Button>
                  ))}
                </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Other */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">{t('other')}</h3>
        <div className="space-y-2">
          <Card 
            className="bg-surface border-border theme-shadow cursor-pointer hover:theme-glow transition-all duration-300 hover:scale-[1.02]"
            onClick={() => navigate('/top-traders')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center theme-glow">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{t('topTraders')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-surface border-border theme-shadow cursor-pointer hover:theme-glow transition-all duration-300 hover:scale-[1.02]"
            onClick={() => navigate('/referral-statistics')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center theme-glow">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{t('referralStatistics')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;