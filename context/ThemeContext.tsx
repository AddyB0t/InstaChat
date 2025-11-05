/**
 * Theme Context
 * Provides theme and font settings globally to the app
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getSettings, updateSettings, AppSettings } from '../services/database';
import { colors as themeColors, fontSize as themeFontSize } from '../styles/theme';

interface ThemeContextType {
  settings: AppSettings;
  updateTheme: (key: keyof AppSettings, value: any) => Promise<void>;
  isLoading: boolean;
  // Helper functions to get current values
  getColors: () => any;
  getFontSize: (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl' | 'xxxl') => number;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    fontSize: 'medium',
    fontFamily: 'serif',
    defaultView: 'all',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await getSettings();
      setSettings(loaded);
    } catch (error) {
      console.error('[ThemeContext] Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTheme = async (key: keyof AppSettings, value: any) => {
    try {
      const updated = await updateSettings({ [key]: value });
      setSettings(updated);
    } catch (error) {
      console.error('[ThemeContext] Error updating settings:', error);
      throw error;
    }
  };

  const getColors = () => {
    // Return colors based on current theme setting
    if (settings.theme === 'light') {
      return themeColors.light;
    } else if (settings.theme === 'auto') {
      // For now, default to dark. In the future, can use Appearance API
      return themeColors.dark;
    }
    return themeColors.dark;
  };

  const getFontSize = (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl' | 'xxxl') => {
    const baseSizes = themeFontSize;
    const multipliers: Record<'small' | 'medium' | 'large', number> = {
      small: 0.9,
      medium: 1,
      large: 1.2,
    };
    const multiplier = multipliers[settings.fontSize];
    return Math.round(baseSizes[size as keyof typeof baseSizes] * multiplier);
  };

  return (
    <ThemeContext.Provider value={{ settings, updateTheme, isLoading, getColors, getFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
