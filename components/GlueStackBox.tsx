import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useGlueStackTheme } from '../context/GlueStackThemeContext';

interface GlueStackBoxProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  bg?: 'primary' | 'surface' | 'background' | 'success' | 'error' | 'warning' | 'info';
  p?: number; // padding
  px?: number; // padding horizontal
  py?: number; // padding vertical
  m?: number; // margin
  mx?: number; // margin horizontal
  my?: number; // margin vertical
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  flexDirection?: 'row' | 'column';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  gap?: number;
  flex?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}

export const GlueStackBox: React.FC<GlueStackBoxProps> = ({
  children,
  style,
  bg,
  p,
  px,
  py,
  m,
  mx,
  my,
  rounded,
  flexDirection = 'column',
  alignItems,
  justifyContent,
  gap,
  flex,
  borderRadius,
  borderWidth,
  borderColor,
}) => {
  const { theme } = useGlueStackTheme();
  const isDark = theme === 'dark';

  const getBackgroundColor = (bgType?: string): string => {
    switch (bgType) {
      case 'primary':
        return isDark ? '#0ea5e9' : '#0284c7';
      case 'surface':
        return isDark ? '#1e293b' : '#f1f5f9';
      case 'background':
        return isDark ? '#0f172a' : '#ffffff';
      case 'success':
        return isDark ? '#22c55e' : '#16a34a';
      case 'error':
        return isDark ? '#ef4444' : '#dc2626';
      case 'warning':
        return isDark ? '#f59e0b' : '#d97706';
      case 'info':
        return isDark ? '#0ea5e9' : '#0284c7';
      default:
        return isDark ? '#0f172a' : '#ffffff';
    }
  };

  const getBorderRadius = (roundType?: string): number => {
    switch (roundType) {
      case 'sm':
        return 4;
      case 'md':
        return 8;
      case 'lg':
        return 12;
      case 'full':
        return 9999;
      default:
        return 0;
    }
  };

  const boxStyle: ViewStyle = {
    backgroundColor: bg ? getBackgroundColor(bg) : undefined,
    padding: p,
    paddingHorizontal: px,
    paddingVertical: py,
    margin: m,
    marginHorizontal: mx,
    marginVertical: my,
    borderRadius: borderRadius || getBorderRadius(rounded),
    flexDirection,
    alignItems,
    justifyContent,
    gap,
    flex,
    borderWidth,
    borderColor,
  };

  return <View style={[boxStyle, style]}>{children}</View>;
};
