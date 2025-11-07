import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useGlueStackTheme } from '../context/GlueStackThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlueStackButtonProps {
  onPress: () => void;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
}

export const GlueStackButton: React.FC<GlueStackButtonProps> = ({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}) => {
  const { theme } = useGlueStackTheme();
  const isDark = theme === 'dark';

  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: size === 'sm' ? 6 : size === 'lg' ? 12 : 8,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled ? 0.6 : 1,
    };

    const sizeStyle: ViewStyle = {
      paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 16 : 12,
      paddingHorizontal: size === 'sm' ? 12 : size === 'lg' ? 24 : 16,
    };

    let colorStyle: ViewStyle = {};

    if (variant === 'primary') {
      colorStyle = {
        backgroundColor: isDark ? '#0ea5e9' : '#0284c7',
      };
    } else if (variant === 'secondary') {
      colorStyle = {
        backgroundColor: isDark ? '#334155' : '#cbd5e1',
      };
    } else if (variant === 'outline') {
      colorStyle = {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: isDark ? '#0ea5e9' : '#0284c7',
      };
    } else if (variant === 'ghost') {
      colorStyle = {
        backgroundColor: 'transparent',
      };
    }

    return { ...baseStyle, ...sizeStyle, ...colorStyle };
  };

  const getTextStyles = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontSize: size === 'sm' ? 12 : size === 'lg' ? 16 : 14,
      fontWeight: '600',
    };

    let colorStyle: TextStyle = {};

    if (variant === 'primary' || variant === 'secondary') {
      colorStyle = {
        color: variant === 'primary' ? '#ffffff' : isDark ? '#ffffff' : '#000000',
      };
    } else {
      colorStyle = {
        color: isDark ? '#0ea5e9' : '#0284c7',
      };
    }

    return { ...baseTextStyle, ...colorStyle };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={getTextStyles()}>{label}</Text>
    </TouchableOpacity>
  );
};
