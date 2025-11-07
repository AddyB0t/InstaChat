/**
 * Tinder-style Swipe Card Component
 * Allows swiping left (delete) or right (favorite)
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Animated, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { Article } from '../services/database';
import { spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

interface SwipeCardProps {
  article: Article;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}

export const SwipeCard = ({ article, onSwipeLeft, onSwipeRight, onTap }: SwipeCardProps) => {
  const { getColors } = useTheme();
  const currentColors = getColors();
  const pan = useRef(new Animated.ValueXY()).current;

  // Reset pan position when article changes
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    pan.flattenOffset();
  }, [article.id, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (event: GestureResponderEvent, { dx, dy }: PanResponderGestureState) => {
        // Only allow horizontal swipes (ignore vertical movement)
        if (Math.abs(dx) > Math.abs(dy)) {
          Animated.event([null, { dx: pan.x, dy: pan.y }], {
            useNativeDriver: false,
          })(event, { dx, dy });
        }
      },
      onPanResponderRelease: (event: GestureResponderEvent, { dx }: PanResponderGestureState) => {
        const swipeThreshold = 100;

        if (dx > swipeThreshold) {
          // Swipe right - open link
          Animated.timing(pan, {
            toValue: { x: 500, y: 0 },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            onSwipeRight();
          });
        } else if (dx < -swipeThreshold) {
          // Swipe left - next article
          Animated.timing(pan, {
            toValue: { x: -500, y: 0 },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            onSwipeLeft();
          });
        } else {
          // Reset to center
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const animatedStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      {
        rotate: pan.x.interpolate({
          inputRange: [-200, 0, 200],
          outputRange: ['-10deg', '0deg', '10deg'],
        }),
      },
    ],
    opacity: pan.x.interpolate({
      inputRange: [-300, -100, 0, 100, 300],
      outputRange: [0.5, 0.8, 1, 0.8, 0.5],
    }),
  };

  return (
    <Animated.View
      style={[styles.cardContainer, animatedStyle]}
      {...panResponder.panHandlers}
    >
      {/* Next Article indicator (left) */}
      <View style={styles.deleteIndicator}>
        <Text style={[styles.indicatorText, { color: currentColors.text }]}>→ NEXT</Text>
      </View>

      {/* Open Link indicator (right) */}
      <View style={styles.favoriteIndicator}>
        <Text style={[styles.indicatorText, { color: currentColors.text }]}>🔗 OPEN</Text>
      </View>

      {/* Card content */}
      <View style={[styles.card, { backgroundColor: currentColors.surface }]}>
        {article.imageUrl && (
          <Image
            source={{ uri: article.imageUrl }}
            style={[styles.cardImage, { backgroundColor: currentColors.surfaceLight }]}
          />
        )}

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: currentColors.text }]} numberOfLines={2}>
            {article.title}
          </Text>

          <Text style={[styles.cardDescription, { color: currentColors.textSecondary }]} numberOfLines={3}>
            {article.summary || 'No description available'}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={[styles.cardMeta, { color: currentColors.textSecondary }]}>
              {new Date(article.savedAt).toLocaleDateString()}
            </Text>
            <Text style={[styles.swipeHint, { color: currentColors.primary }]}>👈 Swipe to action 👉</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    height: 400,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: fontSize.xs,
  },
  swipeHint: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  deleteIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  favoriteIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  indicatorText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
