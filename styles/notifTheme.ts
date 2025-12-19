/**
 * NotiF-style Theme System
 * Comprehensive theming with accent colors and background options
 */

// Light mode accent colors
export const LIGHT_ACCENT_COLORS = {
  orange: {
    primary: '#F97316',
    light: '#FDBA74',
    bg: '#FFF7ED',
  },
  blue: {
    primary: '#3B82F6',
    light: '#93C5FD',
    bg: '#EFF6FF',
  },
  green: {
    primary: '#10B981',
    light: '#6EE7B7',
    bg: '#ECFDF5',
  },
};

// Light mode background colors
export const LIGHT_BACKGROUND_COLORS = {
  'pure-white': {
    primary: '#FFFFFF',
    secondary: '#F0F0F0',
    tertiary: '#E8E8E8',
    border: '#D8D8D8',
  },
  'soft-gray': {
    primary: '#F5F5F5',
    secondary: '#E8E8E8',
    tertiary: '#DCDCDC',
    border: '#C8C8C8',
  },
  'ice-blue': {
    primary: '#FFFFFF',
    secondary: '#F0F7FF',
    tertiary: '#E9F3FF',
    border: '#C9DBF5',
  },
};

// Dark mode accent colors
export const DARK_ACCENT_COLORS = {
  orange: {
    primary: '#F97316',
    light: '#FB923C',
    bg: '#431407',
  },
  cyan: {
    primary: '#06B6D4',
    light: '#22D3EE',
    bg: '#083344',
  },
  lime: {
    primary: '#84CC16',
    light: '#A3E635',
    bg: '#1A2E05',
  },
};

// Dark mode background colors
export const DARK_BACKGROUND_COLORS = {
  'true-black': {
    primary: '#000000',
    secondary: '#0A0A0A',
    tertiary: '#171717',
    border: '#262626',
  },
  'matte-gray': {
    primary: '#0F0F0F',
    secondary: '#1C1C1C',
    tertiary: '#262626',
    border: '#404040',
  },
  midnight: {
    primary: '#0C1222',
    secondary: '#1A2332',
    tertiary: '#2A3444',
    border: '#3A4556',
  },
};

// Type definitions
export type LightAccent = keyof typeof LIGHT_ACCENT_COLORS;
export type LightBackground = keyof typeof LIGHT_BACKGROUND_COLORS;
export type DarkAccent = keyof typeof DARK_ACCENT_COLORS;
export type DarkBackground = keyof typeof DARK_BACKGROUND_COLORS;

// Theme colors interface
export interface ThemeColors {
  accent: {
    primary: string;
    light: string;
    bg: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    border: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
}

// Get theme colors based on dark mode and preferences
export const getThemeColors = (
  isDarkMode: boolean,
  lightAccent: LightAccent = 'orange',
  lightBackground: LightBackground = 'paper',
  darkAccent: DarkAccent = 'orange',
  darkBackground: DarkBackground = 'true-black'
): ThemeColors => {
  if (isDarkMode) {
    return {
      accent: DARK_ACCENT_COLORS[darkAccent],
      background: DARK_BACKGROUND_COLORS[darkBackground],
      text: {
        primary: '#FFFFFF',
        secondary: '#D1D5DB',
        tertiary: '#9CA3AF',
      },
    };
  } else {
    return {
      accent: LIGHT_ACCENT_COLORS[lightAccent],
      background: LIGHT_BACKGROUND_COLORS[lightBackground],
      text: {
        primary: '#111827',
        secondary: '#4B5563',
        tertiary: '#6B7280',
      },
    };
  }
};

// Source icons for different platforms
export const SOURCE_ICONS: Record<string, { icon: string; color: string }> = {
  twitter: { icon: 'logo-twitter', color: '#1DA1F2' },
  instagram: { icon: 'logo-instagram', color: '#E4405F' },
  facebook: { icon: 'logo-facebook', color: '#1877F2' },
  youtube: { icon: 'logo-youtube', color: '#FF0000' },
  reddit: { icon: 'logo-reddit', color: '#FF4500' },
  linkedin: { icon: 'logo-linkedin', color: '#0A66C2' },
  tiktok: { icon: 'logo-tiktok', color: '#000000' },
  github: { icon: 'logo-github', color: '#333333' },
  amazon: { icon: 'logo-amazon', color: '#FF9900' },
  web: { icon: 'globe-outline', color: '#6B7280' },
};

// Default theme settings
export const DEFAULT_THEME_SETTINGS = {
  lightAccent: 'orange' as LightAccent,
  lightBackground: 'paper' as LightBackground,
  darkAccent: 'orange' as DarkAccent,
  darkBackground: 'true-black' as DarkBackground,
};
