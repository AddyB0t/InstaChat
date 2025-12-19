/**
 * BundleIcon Component
 * Floating bundle indicator that shows when articles are added to a bundle
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

interface BundleIconProps {
  count: number;
  onPress: () => void;
  visible: boolean;
}

export const BundleIcon: React.FC<BundleIconProps> = ({ count, onPress, visible }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && count > 0) {
      // Entrance animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }).start();
    } else {
      // Exit animation
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }).start();
    }
  }, [visible, count]);

  useEffect(() => {
    if (count > 0) {
      // Bounce animation when count changes
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [count]);

  const scale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const bounceScale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  if (!visible || count === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale }, { scale: bounceScale }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📦</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </View>
        <Text style={styles.label}>Bundle</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  button: {
    backgroundColor: '#4A9FFF',
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
