/**
 * App Theme and Colors
 */

export const colors = {
  // Dark theme (primary)
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceLight: '#2A2A2A',
    primary: '#4A9FFF',
    primaryLight: '#6BB3FF',
    text: '#E8E8E8',
    textSecondary: '#9CA3AF',
    border: '#3A3A3A',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    card: '#1E1E1E',
  },
  // Light theme
  light: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceLight: '#F3F4F6',
    primary: '#4A9FFF',
    primaryLight: '#6BB3FF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    card: '#FFFFFF',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export type ThemeType = 'dark' | 'light';

export const getThemeColors = (theme: ThemeType) => colors[theme];
