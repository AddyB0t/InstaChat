import React, { createContext, useContext, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface GlueStackThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const GlueStackThemeContext = createContext<GlueStackThemeContextType | undefined>(undefined);

export const GlueStackThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>(
    systemColorScheme === 'dark' ? 'dark' : 'light'
  );

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <GlueStackThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </GlueStackThemeContext.Provider>
  );
};

export const useGlueStackTheme = () => {
  const context = useContext(GlueStackThemeContext);
  if (!context) {
    throw new Error('useGlueStackTheme must be used within GlueStackThemeProvider');
  }
  return context;
};
