/**
 * SwipeCardNew Component
 * Enhanced Tinder-style swipe card with gradients and smooth animations
 * Supports left/right/up swipe gestures
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Article } from '../services/database';
import { PlatformBadge } from './PlatformBadge';
import { getGradientByIndex } from '../styles/gradients';
import Haptic from '../services/hapticService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
const SWIPE_UP_THRESHOLD = 80;

interface SwipeCardNewProps {
  article: Article;
  onSwipeLeft: (article: Article) => void;
  onSwipeRight: (article: Article) => void;
  onSwipeUp: (article: Article) => void;
  onPress: (article: Article) => void;
  index: number;
  isTop: boolean;
}

export const SwipeCardNew: React.FC<SwipeCardNewProps> = ({
  article,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onPress,
  index,
  isTop,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset position when card changes
    pan.setValue({ x: 0, y: 0 });
    pan.flattenOffset();
    opacity.setValue(1);
    scale.setValue(1);
  }, [article.id]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond if user is actually dragging
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        // Haptic feedback on drag start
        Haptic.light();
        // Add slight scale effect on press
        Animated.spring(scale, {
          toValue: 0.98,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (event, gestureState) => {
        if (!isTop) return; // Only allow swiping on top card

        const { dx, dy } = gestureState;

        // Update position
        pan.setValue({ x: dx, y: dy });

        // Update opacity based on swipe distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        const newOpacity = Math.max(0.5, 1 - distance / 300);
        opacity.setValue(newOpacity);
      },
      onPanResponderRelease: (event, { dx, dy }) => {
        if (!isTop) return;

        // Reset scale
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Check for up swipe first (bundle)
        if (dy < -SWIPE_UP_THRESHOLD && absDy > absDx) {
          // Haptic feedback for bundle action
          Haptic.success();
          // Swipe up - add to bundle
          Animated.timing(pan, {
            toValue: { x: 0, y: -SCREEN_HEIGHT },
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            onSwipeUp(article);
          });
          return;
        }

        // Check for right swipe (open & read)
        if (dx > SWIPE_THRESHOLD) {
          // Haptic feedback for read action
          Haptic.success();
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: SCREEN_WIDTH + 100, y: dy },
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onSwipeRight(article);
          });
          return;
        }

        // Check for left swipe (skip)
        if (dx < -SWIPE_THRESHOLD) {
          // Haptic feedback for skip action
          Haptic.warning();
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: -SCREEN_WIDTH - 100, y: dy },
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onSwipeLeft(article);
          });
          return;
        }

        // If swipe was not strong enough, spring back
        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  // Rotation based on horizontal movement
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  // Get gradient for this card
  const gradient = getGradientByIndex(index);

  // Calculate card position for stacking effect
  const cardStyle = isTop
    ? {
        transform: [
          { translateX: pan.x },
          { translateY: pan.y },
          { rotate },
          { scale },
        ],
        opacity,
      }
    : {
        transform: [{ scale: 0.95 }],
        opacity: 0.6,
      };

  // Show swipe indicators
  const leftOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const rightOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, SCREEN_WIDTH],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  const upOpacity = pan.y.interpolate({
    inputRange: [-SCREEN_HEIGHT, -SWIPE_UP_THRESHOLD, 0],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(article)}
        disabled={!isTop}
        style={styles.cardTouchable}
      >
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={styles.gradient}
        >
          {/* Swipe Indicators */}
          <Animated.View style={[styles.swipeIndicator, styles.leftIndicator, { opacity: leftOpacity }]}>
            <Text style={styles.indicatorText}>SKIP</Text>
          </Animated.View>

          <Animated.View style={[styles.swipeIndicator, styles.rightIndicator, { opacity: rightOpacity }]}>
            <Text style={styles.indicatorText}>OPEN</Text>
          </Animated.View>

          <Animated.View style={[styles.swipeIndicator, styles.upIndicator, { opacity: upOpacity }]}>
            <Text style={styles.indicatorText}>BUNDLE</Text>
          </Animated.View>

          {/* Platform Badge - Top Right */}
          {article.platform && (
            <View style={styles.platformBadgeContainer}>
              <PlatformBadge platform={article.platform} size="small" />
            </View>
          )}

          {/* Centered Content */}
          <View style={styles.centeredContent}>
            {/* Article Title - Large and centered on gradient */}
            <Text style={styles.title} numberOfLines={6}>
              {article.title}
            </Text>
          </View>

          {/* Action Button - Bottom */}
          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>
              📖 {article.readingTimeMinutes || 5} min article
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 48,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTouchable: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  platformBadgeContainer: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  actionButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.3,
  },
  swipeIndicator: {
    position: 'absolute',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 5,
  },
  leftIndicator: {
    top: SCREEN_HEIGHT * 0.35,
    left: 20,
  },
  rightIndicator: {
    top: SCREEN_HEIGHT * 0.35,
    right: 20,
  },
  upIndicator: {
    top: 40,
    alignSelf: 'center',
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
