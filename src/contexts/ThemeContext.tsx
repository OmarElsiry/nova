import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'blue' | 'gold' | 'purple' | 'royal-red' | 'deep-teal' | 'blossom-pink' | 'pale-champagne' | 'cocoa-luxe';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Try to get theme from localStorage, default to 'blue'
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'blue';
    }
    return 'blue';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes first
    root.classList.remove('light', 'dark', 'blue', 'gold', 'purple', 'royal-red', 'deep-teal', 'blossom-pink', 'pale-champagne', 'cocoa-luxe');
    
    // Add current theme class
    root.classList.add(theme);
    
    // Store theme in localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};