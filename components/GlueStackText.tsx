import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useGlueStackTheme } from '../context/GlueStackThemeContext';

type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
type TextWeight = '400' | '500' | '600' | '700' | '800';

interface GlueStackTextProps {
  children: React.ReactNode;
  size?: TextSize;
  weight?: TextWeight;
  color?: 'primary' | 'text' | 'textSecondary' | 'success' | 'error' | 'warning' | 'info';
  style?: TextStyle;
  numberOfLines?: number;
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const GlueStackText: React.FC<GlueStackTextProps> = ({
  children,
  size = 'base',
  weight = '400',
  color = 'text',
  style,
  numberOfLines,
  textAlign,
}) => {
  const { theme } = useGlueStackTheme();
  const isDark = theme === 'dark';

  const getFontSize = (sizeType: TextSize): number => {
    switch (sizeType) {
      case 'xs':
        return 12;
      case 'sm':
        return 14;
      case 'base':
        return 16;
      case 'lg':
        return 18;
      case 'xl':
        return 20;
      case '2xl':
        return 24;
      default:
        return 16;
    }
  };

  const getColor = (colorType: string): string => {
    switch (colorType) {
      case 'primary':
        return isDark ? '#0ea5e9' : '#0284c7';
      case 'text':
        return isDark ? '#f1f5f9' : '#0f172a';
      case 'textSecondary':
        return isDark ? '#94a3b8' : '#64748b';
      case 'success':
        return isDark ? '#22c55e' : '#16a34a';
      case 'error':
        return isDark ? '#ef4444' : '#dc2626';
      case 'warning':
        return isDark ? '#f59e0b' : '#d97706';
      case 'info':
        return isDark ? '#0ea5e9' : '#0284c7';
      default:
        return isDark ? '#f1f5f9' : '#0f172a';
    }
  };

  const textStyle: TextStyle = {
    fontSize: getFontSize(size),
    fontWeight: weight as any,
    color: getColor(color),
    textAlign,
  };

  return (
    <Text style={[textStyle, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
};
