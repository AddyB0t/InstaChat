/**
 * PlatformBadge Component
 * Displays a small badge indicating the platform/source of the article
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlatformType, getPlatformConfig } from '../styles/platformColors';

interface PlatformBadgeProps {
  platform: PlatformType;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  platform,
  size = 'medium',
  showLabel = false,
}) => {
  const config = getPlatformConfig(platform);

  const sizeStyles = {
    small: {
      container: { width: 24, height: 24, borderRadius: 12 },
      icon: { fontSize: 12 },
      label: { fontSize: 10 },
    },
    medium: {
      container: { width: 32, height: 32, borderRadius: 16 },
      icon: { fontSize: 16 },
      label: { fontSize: 12 },
    },
    large: {
      container: { width: 40, height: 40, borderRadius: 20 },
      icon: { fontSize: 20 },
      label: { fontSize: 14 },
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          currentSize.container,
          { backgroundColor: config.color },
        ]}
      >
        <Text style={[styles.icon, currentSize.icon]}>{config.icon}</Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, currentSize.label]}>{config.name}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  label: {
    color: '#6B7280',
    fontWeight: '500',
  },
});
