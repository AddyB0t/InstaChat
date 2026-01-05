/**
 * NotiF-style SwipeCard Component
 * Tinder-like swipe card with glow effect and stacked positioning
 */

import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Image,
  TextInput,
  PanResponder,
  Alert,
  Share,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, Pressable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { Article, updateArticle } from '../services/database';
import { ThemeColors } from '../styles/notifTheme';
import { ThemeContext } from '../context/ThemeContext';
import { PlatformType, getPlatformConfig, getVideoThumbnailUrl, isVideoPlatform } from '../styles/platformColors';
import { wp, hp, fp, ms, screenWidth, widthPercent } from '../utils/responsive';
import VideoPreviewModal from './VideoPreviewModal';

const CARD_WIDTH = widthPercent(65);
const CARD_HEIGHT = widthPercent(70);
const SWIPE_THRESHOLD = screenWidth * 0.25;

interface NotifSwipeCardProps {
  article: Article;
  onSwipeLeft: (articleId: number) => void;
  onSwipeRight: (articleId: number) => void;
  onDelete?: (articleId: number) => void;
  onView?: (article: Article) => void;
  onTagsSaved?: () => void;
  onToggleReadStatus?: (articleId: number) => void;
  onMarkAsRead?: (articleId: number) => void;
  onAddToFolder?: (article: Article) => void;
  onAddStackToFolder?: () => void;
  onNotesUpdated?: () => void;
  isTopCard?: boolean;
  colors: ThemeColors;
  isDarkMode?: boolean;
  keepCardOnRightSwipe?: boolean;
  overlayMode?: 'default' | 'open';
  stackIndex?: number;
  isPriorityView?: boolean;
}

export default function NotifSwipeCard({
  article,
  onSwipeLeft,
  onSwipeRight,
  onDelete,
  onView,
  onTagsSaved,
  onToggleReadStatus,
  onMarkAsRead,
  onAddToFolder,
  onAddStackToFolder,
  onNotesUpdated,
  isTopCard = false,
  colors,
  isDarkMode = false,
  keepCardOnRightSwipe = false,
  overlayMode = 'default',
  stackIndex = 0,
  isPriorityView = false,
}: NotifSwipeCardProps) {
  const { settings } = useContext(ThemeContext);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(stackIndex === 0 ? 0.95 : 1);
  const cardOpacity = useSharedValue(stackIndex === 0 ? 0 : 1);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [modalTranslateY, setModalTranslateY] = useState(0);

  // Notes editing state
  const [notesInput, setNotesInput] = useState(article.notes || '');

  // Flip card animation state
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const lastFlipTime = useRef(0);

  // Pan responder for swipe down to close modal
  const modalPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        setModalTranslateY(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        setShowOptionsModal(false);
        setModalTranslateY(0);
        setShowCustomInput(false);
        setCustomTagInput('');
      } else {
        setModalTranslateY(0);
      }
    },
  }), []);

  // Handle Skip button - close modal and swipe left
  const handleSkip = () => {
    setShowOptionsModal(false);
    setShowCustomInput(false);
    setCustomTagInput('');
    onSwipeLeft(article.id);
  };

  // Handle Priority toggle
  const handlePriorityToggle = async () => {
    try {
      const wasBookmarked = article.isBookmarked;
      const newBookmarkState = !wasBookmarked;

      console.log('[NotifSwipeCard] Toggling priority:', {
        articleId: article.id,
        wasBookmarked,
        newBookmarkState,
      });

      await updateArticle(article.id, { isBookmarked: newBookmarkState });
      setShowOptionsModal(false);
      setShowCustomInput(false);
      setCustomTagInput('');

      if (!wasBookmarked) {
        // Was not bookmarked, now saving to priority - swipe right to animate
        onSwipeRight(article.id);
      }
      // Refresh the view to reflect the change - this will remove unbookmarked articles from priority view
      onTagsSaved?.();
    } catch (error) {
      console.error('[NotifSwipeCard] Error toggling priority:', error);
    }
  };

  // Handle flip card for notes
  const handleFlip = () => {
    console.log('[NotifSwipeCard] handleFlip called, current isFlipped:', isFlipped);
    // Prevent rapid tapping with 1500ms cooldown (prevents ghost double-triggers)
    const now = Date.now();
    if (now - lastFlipTime.current < 1500) {
      console.log('[NotifSwipeCard] Flip blocked by cooldown, time since last:', now - lastFlipTime.current);
      return;
    }
    lastFlipTime.current = now;

    const newFlipped = !isFlipped;
    console.log('[NotifSwipeCard] Flipping to:', newFlipped);
    setIsFlipped(newFlipped);
    rotateY.value = withTiming(newFlipped ? 180 : 0, {
      duration: 450,
    });
    // Reset notes input when flipping to back
    if (newFlipped) {
      setNotesInput(article.notes || '');
    }
  };

  // Save notes and flip back
  const handleSaveNotes = async () => {
    console.log('[NotifSwipeCard] handleSaveNotes called, notesInput:', notesInput);
    try {
      const trimmedNotes = notesInput.trim();
      console.log('[NotifSwipeCard] Saving notes:', trimmedNotes, 'for article:', article.id);
      await updateArticle(article.id, { notes: trimmedNotes || undefined });
      console.log('[NotifSwipeCard] Notes saved successfully');
      // Flip back to front
      setIsFlipped(false);
      rotateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      // Call callback to refresh the view
      if (onNotesUpdated) {
        console.log('[NotifSwipeCard] Calling onNotesUpdated callback');
        onNotesUpdated();
      }
    } catch (error) {
      console.error('[NotifSwipeCard] Error saving notes:', error);
      Alert.alert('Error', 'Failed to save description.');
    }
  };

  const addCustomTag = async () => {
    const trimmed = customTagInput.trim();
    if (trimmed) {
      try {
        // Add tag to article and save immediately
        const newTags = [...new Set([...(article.tags || []), trimmed])];
        await updateArticle(article.id, { tags: newTags });
        setCustomTagInput('');
        setShowCustomInput(false);
        setShowOptionsModal(false);
        onTagsSaved?.();
      } catch (error) {
        console.error('[NotifSwipeCard] Error saving tag:', error);
      }
    }
  };

  const removeTag = async (tagToRemove: string) => {
    try {
      const newTags = (article.tags || []).filter(t => t !== tagToRemove);
      await updateArticle(article.id, { tags: newTags });
      onTagsSaved?.();
    } catch (error) {
      console.error('[NotifSwipeCard] Error removing tag:', error);
    }
  };

  // Get platform config early so we can use it in handlers
  const platform = (article.platform?.toLowerCase() || 'web') as PlatformType;
  const platformConfig = getPlatformConfig(platform);
  const isVideoContent = isVideoPlatform(platform);

  // Reset card state when it moves to background (not top card)
  // This fixes the bug where swiped cards don't reset when cycling back
  useEffect(() => {
    if (stackIndex > 0) {
      // Reset all animation values and exit state
      setIsExiting(false);
      translateX.value = 0;
      translateY.value = 0;
      cardScale.value = 1;
      cardOpacity.value = 1;
      // Reset flip state
      setIsFlipped(false);
      rotateY.value = 0;
      scale.value = 1;
    }
  }, [stackIndex]);

  // Entry animation for top card
  useEffect(() => {
    if (stackIndex === 0 && !isExiting) {
      cardScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      cardOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [stackIndex, isExiting]);

  const handleLongPress = () => {
    if (onDelete || onView) {
      setShowOptionsModal(true);
    }
  };

  const handleOpenLink = async () => {
    console.log('[NotifSwipeCard] Opening URL:', article.url, 'isPriorityView:', isPriorityView);
    if (article.url) {
      try {
        // Mark as read only when opened from priority view
        if (isPriorityView && onMarkAsRead) {
          console.log('[NotifSwipeCard] Marking article as read (priority view)');
          onMarkAsRead(article.id);
        }
        // Open URL directly - don't check canOpenURL (requires Android 11+ manifest queries)
        await Linking.openURL(article.url);
      } catch (error) {
        console.error('[NotifSwipeCard] Failed to open URL:', error);
        // Fallback: try opening in browser
        try {
          const webUrl = article.url.startsWith('http') ? article.url : `https://${article.url}`;
          await Linking.openURL(webUrl);
        } catch (fallbackError) {
          console.error('[NotifSwipeCard] Fallback also failed:', fallbackError);
        }
      }
    } else {
      console.error('[NotifSwipeCard] No URL available');
    }
  };

  const handlePreview = () => {
    console.log('[NotifSwipeCard] Opening link directly:', article.url);
    // Always open the link directly in browser/app
    handleOpenLink();
  };

  const handleShare = async () => {
    console.log('[NotifSwipeCard] Sharing article:', article.url);
    if (article.url) {
      try {
        await Share.share({
          message: article.url,
          title: article.title,
        });
      } catch (error) {
        console.error('[NotifSwipeCard] Error sharing:', error);
      }
    }
  };

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    setIsExiting(true);
    if (direction === 'left') {
      onSwipeLeft(article.id);
    } else {
      onSwipeRight(article.id);
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(isTopCard && !isExiting)
    .onStart(() => {
      // Scale up slightly on drag start
      scale.value = withSpring(1.02, { damping: 15 });
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      const shouldSwipeLeft = e.translationX < -SWIPE_THRESHOLD;
      const shouldSwipeRight = e.translationX > SWIPE_THRESHOLD;

      if (shouldSwipeLeft) {
        translateX.value = withTiming(-screenWidth * 1.5, { duration: 300 });
        cardOpacity.value = withTiming(0, { duration: 250 });
        runOnJS(handleSwipeComplete)('left');
      } else if (shouldSwipeRight) {
        if (keepCardOnRightSwipe) {
          // Call onSwipeRight immediately (don't wait for animation)
          runOnJS(onSwipeRight)(article.id);
          // Then animate card back to center
          translateX.value = withSpring(0, { damping: 15 });
          translateY.value = withSpring(0, { damping: 15 });
        } else {
          translateX.value = withTiming(screenWidth * 1.5, { duration: 300 });
          cardOpacity.value = withTiming(0, { duration: 250 });
          runOnJS(handleSwipeComplete)('right');
        }
      } else {
        // Reset with spring animation
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
      // Scale back down
      scale.value = withSpring(1, { damping: 15 });
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(isTopCard && !isExiting && !isFlipped)
    .minDuration(400)
    .onEnd((e, success) => {
      if (success) {
        runOnJS(handleLongPress)();
      }
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    // Stack positioning
    const baseScale = stackIndex === 0 ? 1 : 0.92;
    const baseOpacity = stackIndex === 0 ? 1 : 0.7;

    let xOffset = 0;
    let cardRotate = '0deg';
    if (stackIndex === 1) {
      xOffset = -CARD_WIDTH * 0.15;
      cardRotate = '3deg';
    } else if (stackIndex === 2) {
      xOffset = CARD_WIDTH * 0.15;
      cardRotate = '-3deg';
    }

    const yOffset = stackIndex === 0 ? 0 : -25;

    // Apply entry/exit animation for top card
    const finalScale = stackIndex === 0 ? cardScale.value * scale.value : baseScale;
    const finalOpacity = stackIndex === 0 ? cardOpacity.value : baseOpacity;

    return {
      transform: [
        { translateX: stackIndex === 0 ? translateX.value : xOffset },
        { translateY: stackIndex === 0 ? translateY.value : yOffset },
        { rotate: stackIndex === 0 ? `${rotate}deg` : cardRotate },
        { scale: finalScale },
      ],
      opacity: finalOpacity,
      zIndex: 10 - stackIndex,
    };
  });

  // Flip animation using scaleX for reliable Android support
  // Card "flips" by scaling to 0 on X axis, then back to 1
  const flipAnimatedStyle = useAnimatedStyle(() => {
    // Scale from 1 -> 0 -> 1 as rotateY goes 0 -> 90 -> 180
    const scaleX = interpolate(
      rotateY.value,
      [0, 90, 180],
      [1, 0, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scaleX }],
    };
  });

  // Front side - visible when rotateY < 90
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const isVisible = rotateY.value < 90;
    return {
      opacity: isVisible ? 1 : 0,
      zIndex: isVisible ? 2 : 1,
    };
  });

  // Back side - visible when rotateY >= 90
  const backAnimatedStyle = useAnimatedStyle(() => {
    const isVisible = rotateY.value >= 90;
    return {
      opacity: isVisible ? 1 : 0,
      zIndex: isVisible ? 2 : 1,
    };
  });

  // Determine pointer events based on flip state
  const frontPointerEvents = isFlipped ? 'none' : 'auto';
  const backPointerEvents = isFlipped ? 'auto' : 'none';

  const leftOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0]
    );
    return { opacity };
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]);
    return { opacity };
  });

  // Get video thumbnail if applicable
  const videoThumbnail = article.url ? getVideoThumbnailUrl(article.url, platform) : null;
  const hasVideoThumbnail = videoThumbnail && isVideoPlatform(platform);

  // Time since saved
  const getTimeSince = () => {
    const savedDate = new Date(article.savedAt);
    const now = new Date();
    const diff = now.getTime() - savedDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h ago`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m ago`;
  };

  return (
    <>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.cardContainer,
            animatedStyle,
            { left: (screenWidth - CARD_WIDTH) / 2 },
          ]}
        >
          {/* Glow effect for top card */}
          {stackIndex === 0 && (
            <>
              <View
                style={[
                  styles.glowOuter,
                  { backgroundColor: colors.accent.primary, opacity: 0.2 },
                ]}
              />
              <View
                style={[
                  styles.glowMiddle,
                  { backgroundColor: colors.accent.primary, opacity: 0.3 },
                ]}
              />
              <View
                style={[
                  styles.glowInner,
                  { backgroundColor: colors.accent.primary, opacity: 0.15 },
                ]}
              />
            </>
          )}

          {/* Flip Container - applies scaleX animation */}
          <Animated.View style={[styles.flipContainer, flipAnimatedStyle]}>
          {/* Front Side */}
          <Animated.View style={[styles.cardFace, frontAnimatedStyle]} pointerEvents={frontPointerEvents}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.background.primary,
                  borderColor: stackIndex === 0 ? colors.accent.primary : colors.accent.light,
                  borderWidth: stackIndex === 0 ? 2 : 1,
                },
              ]}
            >
            {/* Swipe overlays - only on top card */}
            {stackIndex === 0 && (
              <>
                {/* Left Overlay - Skip */}
                <Animated.View style={[styles.overlay, leftOverlayStyle]}>
                  <LinearGradient
                    colors={['rgba(75, 85, 99, 0.95)', 'rgba(55, 65, 81, 0.98)']}
                    style={styles.overlayGradient}
                  >
                    <View style={styles.overlayContent}>
                      <View style={[styles.overlayIconContainer, styles.skipIconContainer]}>
                        <Icon name="close" size={fp(36)} color="#FFFFFF" />
                      </View>
                      <Text style={styles.overlayEmoji}>👋</Text>
                      <Text style={[styles.overlayText, styles.skipText]}>SKIP</Text>
                      <Text style={styles.overlaySubtext}>Not interested</Text>
                    </View>
                  </LinearGradient>
                </Animated.View>

                {/* Right Overlay - Priority/Open */}
                <Animated.View style={[styles.overlay, rightOverlayStyle]}>
                  <LinearGradient
                    colors={overlayMode === 'default'
                      ? ['rgba(16, 185, 129, 0.95)', 'rgba(5, 150, 105, 0.98)']
                      : ['rgba(59, 130, 246, 0.95)', 'rgba(37, 99, 235, 0.98)']}
                    style={styles.overlayGradient}
                  >
                    <View style={styles.overlayContent}>
                      <View style={[
                        styles.overlayIconContainer,
                        overlayMode === 'default' ? styles.priorityIconContainer : styles.openIconContainer
                      ]}>
                        <Icon
                          name={overlayMode === 'default' ? 'heart' : 'open-outline'}
                          size={fp(36)}
                          color="#FFFFFF"
                        />
                      </View>
                      <Text style={styles.overlayEmoji}>
                        {overlayMode === 'default' ? '⭐' : '🚀'}
                      </Text>
                      <Text style={[styles.overlayText, styles.priorityText]}>
                        {overlayMode === 'default' ? 'PRIORITY' : 'OPEN'}
                      </Text>
                      <Text style={styles.overlaySubtext}>
                        {overlayMode === 'default' ? 'Save for later' : 'View now'}
                      </Text>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </>
            )}

            {/* VIDEO PLATFORM LAYOUT: Thumbnail with title below */}
            {isVideoContent && article.imageUrl ? (
              <>
                {/* Header with platform badge and buttons */}
                <View style={styles.videoCardHeader}>
                  <View style={styles.headerLeft}>
                    <View
                      style={[
                        styles.platformBadge,
                        { backgroundColor: platformConfig.color },
                      ]}
                    >
                      <Icon
                        name={platformConfig.icon}
                        size={fp(14)}
                        color={platform === 'snapchat' ? '#000000' : '#FFFFFF'}
                      />
                    </View>
                    <Text style={[styles.timeText, { color: colors.text.tertiary }]}>
                      {getTimeSince()}
                    </Text>
                    {/* Read indicator - simple tick */}
                    {article.isUnread === false && (
                      <Icon name="checkmark-circle" size={fp(16)} color="#10B981" style={styles.readTick} />
                    )}
                  </View>
                  <View style={styles.headerRight}>
                    <Pressable
                      style={[styles.iconButton, { backgroundColor: colors.background.secondary }]}
                      onPress={handlePreview}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="eye" size={fp(14)} color={colors.text.secondary} />
                    </Pressable>
                    <Pressable
                      style={[styles.iconButton, { backgroundColor: platformConfig.color }]}
                      onPress={handleShare}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="share-outline" size={fp(14)} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>

                {/* Thumbnail container - tap to play video */}
                <TouchableOpacity
                  style={styles.videoThumbnailContainer}
                  onPress={() => setShowVideoModal(true)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: article.imageUrl }}
                    style={styles.videoThumbnail}
                    resizeMode={platform === 'youtube' ? 'contain' : 'cover'}
                  />
                </TouchableOpacity>

                {/* Title below thumbnail */}
                <View style={styles.videoTitleContainerBelow}>
                  <Text
                    style={[styles.cardTitle, { color: colors.text.primary }]}
                    numberOfLines={2}
                  >
                    {article.title}
                  </Text>
                  {/* Author if available */}
                  {article.author && article.author !== 'Unknown' && (
                    <Text style={[styles.videoAuthorBelow, { color: colors.text.tertiary }]}>
                      @{article.author}
                    </Text>
                  )}
                  {/* User tags on video cards */}
                  {article.tags && article.tags.length > 0 && (
                    <View style={styles.videoTagsContainer}>
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <View
                          key={index}
                          style={[styles.tagBadge, { backgroundColor: colors.accent.bg }]}
                        >
                          <Text style={[styles.tagText, { color: colors.accent.primary }]}>
                            #{tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            ) : (
              /* TEXT PLATFORM LAYOUT: Title + Description */
              <>
                {/* Platform watermark background */}
                <View style={styles.watermarkContainer}>
                  <Icon
                    name={platformConfig.icon}
                    size={CARD_WIDTH * 0.45}
                    color={isDarkMode ? '#404040' : colors.background.tertiary}
                    style={{ opacity: isDarkMode ? 0.5 : 0.3 }}
                  />
                </View>

                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    {/* Platform badge with brand color */}
                    <View
                      style={[
                        styles.platformBadge,
                        { backgroundColor: platformConfig.color },
                      ]}
                    >
                      <Icon
                        name={platformConfig.icon}
                        size={fp(14)}
                        color={platform === 'snapchat' ? '#000000' : '#FFFFFF'}
                      />
                    </View>
                    <Text style={[styles.timeText, { color: colors.text.tertiary }]}>
                      {getTimeSince()}
                    </Text>
                    {article.readingTimeMinutes && (
                      <View style={styles.readingTimeBadge}>
                        <Icon name="time-outline" size={fp(10)} color="#FFFFFF" />
                        <Text style={styles.readingTimeText}>
                          {article.readingTimeMinutes}m
                        </Text>
                      </View>
                    )}
                    {/* Read indicator - simple tick */}
                    {article.isUnread === false && (
                      <Icon name="checkmark-circle" size={fp(16)} color="#10B981" style={styles.readTick} />
                    )}
                  </View>
                  <View style={styles.headerRight}>
                    <Pressable
                      style={[styles.iconButton, { backgroundColor: colors.background.secondary }]}
                      onPress={handlePreview}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="eye" size={fp(14)} color={colors.text.secondary} />
                    </Pressable>
                    <Pressable
                      style={[styles.iconButton, { backgroundColor: colors.accent.primary }]}
                      onPress={handleShare}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="share-outline" size={fp(14)} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>

                {/* Card title */}
                <Text
                  style={[styles.cardTitle, { color: colors.text.primary }]}
                  numberOfLines={3}
                >
                  {article.title}
                </Text>

                {/* Summary/Description - limited to 2 lines */}
                {article.summary && (
                  <Text
                    style={[styles.cardDescription, { color: colors.text.secondary }]}
                    numberOfLines={2}
                  >
                    {article.summary}
                  </Text>
                )}

                {/* User tags at bottom */}
                {article.tags && article.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {article.tags.slice(0, 3).map((tag, index) => (
                      <View
                        key={index}
                        style={[styles.tagBadge, { backgroundColor: colors.accent.bg }]}
                      >
                        <Text style={[styles.tagText, { color: colors.accent.primary }]}>
                          #{tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

          </View>

            {/* Flip Button - Only show on front when not flipped */}
            {stackIndex === 0 && !isFlipped && (
              <Pressable
                style={[
                  styles.flipIconButton,
                  { backgroundColor: colors.accent.primary + '20' },
                ]}
                onPress={handleFlip}
              >
                <Icon
                  name="sync-outline"
                  size={fp(18)}
                  color={colors.accent.primary}
                />
              </Pressable>
            )}
          </Animated.View>

          {/* Back Side - Notes Input */}
          <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]} pointerEvents={backPointerEvents}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.background.primary,
                  borderColor: colors.accent.primary,
                  borderWidth: 2,
                },
              ]}
            >
              {/* Back Header */}
              <View style={styles.backHeader}>
                <View style={styles.backHeaderLeft}>
                  <Icon name="document-text" size={fp(24)} color={colors.accent.primary} />
                  <Text style={[styles.backTitle, { color: colors.text.primary }]}>
                    Add Description
                  </Text>
                </View>
              </View>

              {/* Article Title Reference */}
              <Text
                style={[styles.backArticleTitle, { color: colors.text.tertiary }]}
                numberOfLines={2}
              >
                {article.title}
              </Text>

              {/* Notes Input */}
              <View style={[styles.notesInputContainer, { borderColor: colors.accent.light }]}>
                <TextInput
                  style={[styles.notesTextInput, { color: colors.text.primary }]}
                  placeholder="Write your description here..."
                  placeholderTextColor={colors.text.tertiary}
                  value={notesInput}
                  onChangeText={setNotesInput}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Save Button */}
              <Pressable
                style={[styles.saveNotesButton, { backgroundColor: colors.accent.primary }]}
                onPress={handleSaveNotes}
              >
                <Icon name="checkmark" size={fp(18)} color="#FFFFFF" />
                <Text style={styles.saveNotesButtonText}>Save Description</Text>
              </Pressable>
            </View>

            {/* Flip Button - Top right on back side, only show when flipped */}
            {isFlipped && (
              <Pressable
                style={[
                  styles.flipIconButtonTopRight,
                  { backgroundColor: colors.accent.primary + '20' },
                ]}
                onPress={handleFlip}
              >
                <Icon
                  name="sync-outline"
                  size={fp(18)}
                  color={colors.accent.primary}
                />
              </Pressable>
            )}
          </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowOptionsModal(false);
          setModalTranslateY(0);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowOptionsModal(false);
              setModalTranslateY(0);
            }}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background.secondary,
                transform: [{ translateY: modalTranslateY }],
              }
            ]}
            {...modalPanResponder.panHandlers}
          >
            {/* Swipe indicator */}
            <View style={styles.modalSwipeIndicator}>
              <View style={[styles.swipeHandle, { backgroundColor: colors.text.tertiary }]} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Why is this interesting?
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.text.tertiary }]}>
                Tag it so you remember later
              </Text>
            </View>

            {/* Current Tags on this article */}
            {article.tags && article.tags.length > 0 && (
              <View style={styles.currentTagsSection}>
                <Text style={[styles.currentTagsLabel, { color: colors.text.secondary }]}>
                  Tags on this article:
                </Text>
                <View style={styles.currentTagsContainer}>
                  {article.tags.map((tag, index) => (
                    <TouchableOpacity
                      key={`tag-${tag}-${index}`}
                      style={[styles.currentTagChip, { backgroundColor: colors.accent.primary }]}
                      onPress={() => removeTag(tag)}
                    >
                      <Text style={styles.currentTagChipText}>{tag}</Text>
                      <Icon name="close" size={fp(12)} color="#FFFFFF" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Add Tagline */}
            {showCustomInput ? (
              <View style={[styles.customInputRow, { borderColor: colors.accent.primary }]}>
                <View style={styles.taglineInputContainer}>
                  <TextInput
                    style={[styles.customTagInput, { color: colors.text.primary }]}
                    placeholder="Add a tagline..."
                    placeholderTextColor={colors.text.tertiary}
                    value={customTagInput}
                    onChangeText={setCustomTagInput}
                    autoFocus
                    onSubmitEditing={addCustomTag}
                    returnKeyType="done"
                    maxLength={20}
                  />
                  <Text style={[styles.charCounter, { color: colors.text.tertiary }]}>
                    {customTagInput.length}/20
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addTagButton, { backgroundColor: colors.accent.primary }]}
                  onPress={addCustomTag}
                >
                  <Icon name="checkmark" size={fp(18)} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelTagButton}
                  onPress={() => {
                    setShowCustomInput(false);
                    setCustomTagInput('');
                  }}
                >
                  <Icon name="close" size={fp(18)} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addReasonButton, { backgroundColor: colors.background.tertiary }]}
                onPress={() => setShowCustomInput(true)}
              >
                <Icon name="add-circle-outline" size={fp(18)} color={colors.accent.primary} />
                <Text style={[styles.addReasonText, { color: colors.text.primary }]}>
                  Add tagline
                </Text>
              </TouchableOpacity>
            )}

            {/* Action buttons - different layouts for Priority view vs Home view */}
            {isPriorityView && (onAddToFolder || onAddStackToFolder) ? (
              // Priority view: Custom Card + Custom Stack
              <View style={styles.modalBottomButtons}>
                {/* Custom Card - saves only current card */}
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => {
                    setShowOptionsModal(false);
                    setShowCustomInput(false);
                    setCustomTagInput('');
                    if (onAddToFolder) onAddToFolder(article);
                  }}
                >
                  <Icon name="document" size={fp(18)} color="#FFFFFF" />
                  <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Custom Card</Text>
                </TouchableOpacity>

                {/* Custom Stack - saves entire priority stack */}
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => {
                    setShowOptionsModal(false);
                    setShowCustomInput(false);
                    setCustomTagInput('');
                    if (onAddStackToFolder) onAddStackToFolder();
                  }}
                >
                  <Icon name="albums" size={fp(18)} color="#FFFFFF" />
                  <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Custom Stack</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Home view: Skip + Priority + Custom Card (if onAddToFolder provided)
              <View style={styles.modalBottomButtonsColumn}>
                {/* Top row: Skip and Priority */}
                <View style={styles.modalBottomButtons}>
                  {/* Skip Button */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.background.tertiary }]}
                    onPress={handleSkip}
                  >
                    <Icon name="play-skip-forward" size={fp(18)} color={colors.text.secondary} />
                    <Text style={[styles.actionButtonText, { color: colors.text.secondary }]}>Skip</Text>
                  </TouchableOpacity>

                  {/* Priority/Return Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.accent.primary }
                    ]}
                    onPress={handlePriorityToggle}
                  >
                    <Icon
                      name={article.isBookmarked ? 'arrow-undo' : 'heart'}
                      size={fp(18)}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                      {article.isBookmarked ? 'Return to Stack' : 'Save to Priority'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Card button - only if onAddToFolder is provided */}
                {onAddToFolder && (
                  <TouchableOpacity
                    style={[styles.actionButtonFull, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => {
                      setShowOptionsModal(false);
                      setShowCustomInput(false);
                      setCustomTagInput('');
                      onAddToFolder(article);
                    }}
                  >
                    <Icon name="folder" size={fp(18)} color="#FFFFFF" />
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Custom Card</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Delete Button */}
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Article',
                    'Are you sure you want to delete this article? This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          setShowOptionsModal(false);
                          onDelete(article.id);
                        },
                      },
                    ]
                  );
                }}
              >
                <Icon name="trash-outline" size={fp(18)} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Delete Article</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Video Preview Modal */}
      <VideoPreviewModal
        visible={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        url={article.url || ''}
        title={article.title}
        platform={platform}
        isDarkMode={isDarkMode}
        colors={colors}
      />

    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  flipContainer: {
    width: '100%',
    height: '100%',
  },
  glowOuter: {
    position: 'absolute',
    top: ms(-12),
    left: ms(-12),
    right: ms(-12),
    bottom: ms(-12),
    borderRadius: ms(32),
  },
  glowMiddle: {
    position: 'absolute',
    top: ms(-6),
    left: ms(-6),
    right: ms(-6),
    bottom: ms(-6),
    borderRadius: ms(28),
  },
  glowInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ms(24),
  },
  card: {
    flex: 1,
    borderRadius: ms(24),
    padding: wp(16),
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkIcon: {
    fontSize: CARD_WIDTH * 0.5,
    fontWeight: 'bold',
  },
  thumbnailBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ms(24),
    opacity: 0.15,
  },
  fullThumbnailBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ms(22),
  },
  thumbnailGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
    borderBottomLeftRadius: ms(22),
    borderBottomRightRadius: ms(22),
  },
  videoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    marginBottom: hp(8),
  },
  videoThumbnailContainer: {
    flex: 1,
    borderRadius: ms(12),
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginBottom: hp(8),
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: ms(12),
  },
  videoTitleContainerBelow: {
    marginTop: 'auto',
  },
  videoAuthorBelow: {
    fontSize: fp(11),
    fontWeight: '500',
    marginTop: hp(2),
  },
  videoTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(6),
    marginTop: hp(6),
  },
  videoTimeText: {
    fontSize: fp(11),
    marginLeft: wp(6),
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  videoTitleContainer: {
    position: 'absolute',
    bottom: wp(16),
    left: wp(16),
    right: wp(16),
    zIndex: 10,
  },
  videoCardTitle: {
    fontSize: fp(16),
    fontWeight: '700',
    lineHeight: fp(22),
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  videoAuthor: {
    fontSize: fp(12),
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: hp(4),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ms(24),
    overflow: 'hidden',
    zIndex: 100,
  },
  overlayGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    alignItems: 'center',
  },
  overlayIconContainer: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(6) },
    shadowOpacity: 0.4,
    shadowRadius: ms(12),
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipIconContainer: {
    backgroundColor: '#6B7280',
  },
  priorityIconContainer: {
    backgroundColor: '#10B981',
  },
  openIconContainer: {
    backgroundColor: '#3B82F6',
  },
  overlayEmoji: {
    fontSize: fp(32),
    marginTop: hp(12),
  },
  overlayText: {
    color: 'white',
    fontSize: fp(24),
    fontWeight: '800',
    marginTop: hp(8),
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  skipText: {
    color: '#F3F4F6',
  },
  priorityText: {
    color: '#FFFFFF',
  },
  overlaySubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: fp(13),
    fontWeight: '500',
    marginTop: hp(4),
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(12),
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformBadge: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: fp(11),
    marginLeft: wp(6),
  },
  readingTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    borderRadius: ms(10),
    marginLeft: wp(6),
  },
  readingTimeText: {
    color: 'white',
    fontSize: fp(10),
    fontWeight: '600',
  },
  readTick: {
    marginLeft: wp(6),
  },
  headerRight: {
    flexDirection: 'row',
    gap: wp(6),
  },
  iconButton: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: fp(16),
    fontWeight: '700',
    lineHeight: fp(22),
    marginBottom: hp(10),
    zIndex: 10,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: wp(10),
    paddingVertical: hp(3),
    borderRadius: ms(10),
    marginBottom: hp(6),
  },
  categoryText: {
    fontSize: fp(11),
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: fp(13),
    lineHeight: fp(18),
    marginBottom: hp(10),
    zIndex: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(6),
    marginTop: 'auto',
    zIndex: 10,
  },
  tagBadge: {
    paddingHorizontal: wp(8),
    paddingVertical: hp(3),
    borderRadius: ms(8),
  },
  tagText: {
    fontSize: fp(10),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    padding: wp(20),
    paddingBottom: hp(40),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalSwipeIndicator: {
    alignItems: 'center',
    paddingVertical: hp(8),
  },
  swipeHandle: {
    width: wp(40),
    height: hp(4),
    borderRadius: ms(2),
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: hp(24),
    paddingTop: hp(8),
  },
  modalTitle: {
    fontSize: fp(20),
    fontWeight: '700',
    marginBottom: hp(6),
  },
  modalSubtitle: {
    fontSize: fp(13),
    textAlign: 'center',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: wp(10),
    marginBottom: hp(20),
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(14),
    paddingVertical: hp(10),
    borderRadius: ms(20),
  },
  tagOptionText: {
    fontSize: fp(13),
    fontWeight: '500',
  },
  addCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(12),
    marginBottom: hp(20),
  },
  addCustomText: {
    fontSize: fp(14),
    marginLeft: wp(8),
    fontWeight: '500',
  },
  customTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: wp(8),
    marginBottom: hp(12),
  },
  customTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(12),
    paddingVertical: hp(6),
    borderRadius: ms(16),
    gap: wp(4),
  },
  customTagChipText: {
    color: '#FFFFFF',
    fontSize: fp(12),
    fontWeight: '500',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(20),
    borderWidth: 2,
    borderRadius: ms(12),
    paddingHorizontal: wp(12),
    paddingVertical: hp(4),
  },
  customTagInput: {
    flex: 1,
    fontSize: fp(14),
    paddingVertical: hp(8),
  },
  taglineInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  charCounter: {
    fontSize: fp(11),
    marginLeft: wp(4),
  },
  addTagButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(8),
  },
  cancelTagButton: {
    width: ms(32),
    height: ms(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(4),
  },
  currentTagsSection: {
    marginBottom: hp(16),
  },
  currentTagsLabel: {
    fontSize: fp(13),
    fontWeight: '500',
    marginBottom: hp(10),
    textAlign: 'center',
  },
  currentTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: wp(8),
  },
  currentTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(12),
    paddingVertical: hp(8),
    borderRadius: ms(16),
    gap: wp(4),
  },
  currentTagChipText: {
    fontSize: fp(12),
    fontWeight: '500',
    color: '#FFFFFF',
  },
  addReasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(14),
    paddingHorizontal: wp(20),
    borderRadius: ms(12),
    gap: wp(8),
    marginBottom: hp(16),
  },
  addReasonText: {
    fontSize: fp(15),
    fontWeight: '600',
  },
  modalBottomButtons: {
    flexDirection: 'row',
    gap: wp(12),
    marginBottom: hp(16),
  },
  modalBottomButtonsColumn: {
    gap: hp(12),
    marginBottom: hp(16),
  },
  actionButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(14),
    paddingHorizontal: wp(20),
    borderRadius: ms(16),
    gap: wp(8),
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(14),
    paddingHorizontal: wp(20),
    borderRadius: ms(12),
    gap: wp(6),
  },
  skipButtonText: {
    fontSize: fp(15),
    fontWeight: '600',
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(14),
    borderRadius: ms(12),
    gap: wp(6),
  },
  priorityButtonText: {
    fontSize: fp(15),
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(12),
    gap: wp(6),
  },
  deleteButtonText: {
    fontSize: fp(14),
    fontWeight: '500',
    color: '#EF4444',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(14),
    borderRadius: ms(12),
    gap: wp(6),
  },
  actionButtonText: {
    fontSize: fp(15),
    fontWeight: '600',
  },
  // Existing Tags Styles
  existingTagsSection: {
    marginBottom: hp(16),
  },
  existingTagsLabel: {
    fontSize: fp(13),
    fontWeight: '500',
    marginBottom: hp(10),
    textAlign: 'center',
  },
  existingTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: wp(8),
  },
  existingTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(12),
    paddingVertical: hp(8),
    borderRadius: ms(16),
    gap: wp(4),
  },
  existingTagChipText: {
    fontSize: fp(12),
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // User tags on card
  userTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(4),
    marginTop: hp(4),
  },
  userTagBadge: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    borderRadius: ms(6),
  },
  userTagText: {
    fontSize: fp(9),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Notes modal styles
  notesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(20),
  },
  notesModalContainer: {
    width: '100%',
    maxWidth: wp(360),
    borderRadius: ms(24),
    padding: wp(24),
  },
  notesModalHeader: {
    alignItems: 'center',
    gap: hp(4),
    marginBottom: hp(20),
  },
  notesModalTitle: {
    fontSize: fp(22),
    fontWeight: '700',
    marginTop: hp(8),
  },
  notesModalSubtitle: {
    fontSize: fp(14),
    textAlign: 'center',
  },
  notesInputContainer: {
    borderWidth: 2,
    borderRadius: ms(12),
    marginBottom: hp(16),
    marginTop: hp(8),
  },
  notesInput: {
    fontSize: fp(16),
    padding: wp(16),
    minHeight: hp(150),
    lineHeight: fp(24),
  },
  notesModalButtons: {
    flexDirection: 'row',
    gap: wp(12),
  },
  notesModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(14),
    borderRadius: ms(12),
    gap: wp(6),
  },
  notesModalButtonText: {
    fontSize: fp(16),
    fontWeight: '600',
  },
  // Flip card styles
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardBack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  flipIconButton: {
    position: 'absolute',
    bottom: wp(12),
    right: wp(12),
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  flipIconButtonTopRight: {
    position: 'absolute',
    top: wp(12),
    right: wp(12),
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: wp(10),
    borderRadius: ms(10),
    marginTop: hp(8),
    gap: wp(8),
  },
  notesPreviewText: {
    flex: 1,
    fontSize: fp(11),
    lineHeight: fp(15),
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(12),
  },
  backHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
  },
  backTitle: {
    fontSize: fp(18),
    fontWeight: '700',
  },
  flipBackButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArticleTitle: {
    fontSize: fp(12),
    lineHeight: fp(16),
    marginBottom: hp(12),
  },
  notesTextInput: {
    fontSize: fp(14),
    lineHeight: fp(20),
    textAlignVertical: 'top',
    paddingHorizontal: wp(10),
    paddingTop: wp(8),
    paddingBottom: wp(8),
    minHeight: hp(60),
    maxHeight: hp(80),
  },
  saveNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(12),
    borderRadius: ms(12),
    gap: wp(6),
    marginTop: hp(12),
  },
  saveNotesButtonText: {
    color: '#FFFFFF',
    fontSize: fp(15),
    fontWeight: '600',
  },
});
