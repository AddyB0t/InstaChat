/**
 * Browse Screen - Swipe Card Interface
 * Tinder-style swiping for unread articles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllArticles, deleteArticle, Article, updateArticle } from '../services/database';
import { SwipeCard } from '../components/SwipeCard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

export default function BrowseScreen({ navigation }: any) {
  const { getColors } = useTheme();
  const currentColors = getColors();

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadArticles();
    }, [])
  );

  const loadArticles = async () => {
    try {
      setIsLoading(true);
      const allArticles = await getAllArticles();
      // Filter to show only unread articles, sorted by newest first
      const unreadArticles = allArticles
        .filter(a => a.isUnread !== false) // Show unread articles
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setArticles(unreadArticles);
      // Always reset to first article after reload
      setCurrentIndex(0);
    } catch (error) {
      console.error('[BrowseScreen] Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipeLeft = () => {
    // Swipe left: Go to next article (circular)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % articles.length);
  };

  const handleSwipeRight = async () => {
    // Swipe right: Mark as read, open URL in browser AND move to next article
    if (currentIndex >= articles.length) return;

    const article = articles[currentIndex];
    try {
      // Mark as read
      await updateArticle(article.id, { isUnread: false });

      // Open URL if available
      if (article.url) {
        console.log('[BrowseScreen] Attempting to open URL:', article.url);
        try {
          const canOpen = await Linking.canOpenURL(article.url);
          console.log('[BrowseScreen] Can open URL:', canOpen);
          if (canOpen) {
            await Linking.openURL(article.url);
            console.log('[BrowseScreen] URL opened successfully');
          } else {
            console.log('[BrowseScreen] Cannot open URL, trying to open in browser anyway');
            // Try opening even if canOpenURL returns false
            await Linking.openURL(article.url);
          }
        } catch (linkError) {
          console.error('[BrowseScreen] Error opening URL:', linkError);
        }
      } else {
        console.log('[BrowseScreen] No URL available for article');
      }
    } catch (error) {
      console.error('[BrowseScreen] Error:', error);
    } finally {
      // Add small delay to let animation complete, then reload articles
      setTimeout(() => {
        loadArticles();
      }, 400);
    }
  };

  const handleTap = () => {
    // Tap: Open article detail view
    if (currentIndex < articles.length) {
      const article = articles[currentIndex];
      navigation.navigate('ArticleDetail', { articleId: article.id, title: article.title });
    }
  };

  if (isLoading && articles.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.background }]}>
        <ActivityIndicator size="large" color={currentColors.primary} />
      </View>
    );
  }

  if (articles.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={[styles.emptyTitle, { color: currentColors.text }]}>No unread articles</Text>
          <Text style={[styles.emptyDescription, { color: currentColors.textSecondary }]}>
            Share URLs or use the Add tab to save articles
          </Text>
        </View>
      </View>
    );
  }

  if (currentIndex >= articles.length) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✨</Text>
          <Text style={[styles.emptyTitle, { color: currentColors.text }]}>All caught up!</Text>
          <Text style={[styles.emptyDescription, { color: currentColors.textSecondary }]}>
            You've reviewed all {articles.length} unread articles
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={[styles.header, { borderBottomColor: currentColors.primary }]}>
        <Text style={[styles.title, { color: currentColors.text }]}>Home</Text>
        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
          {currentIndex + 1} of {articles.length}
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Current card */}
        {currentIndex < articles.length && (
          <SwipeCard
            article={articles[currentIndex]}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={handleTap}
          />
        )}

        {/* Preview of next card */}
        {currentIndex + 1 < articles.length && (
          <View style={styles.nextCardPreview}>
            <Text style={[styles.nextCardTitle, { color: currentColors.textSecondary }]} numberOfLines={1}>
              {articles[currentIndex + 1].title}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: currentColors.border }]}>
        <Text style={[styles.actionText, { color: currentColors.textSecondary }]}>
          ← Next Article • Open Link →
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.dark.primary,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing.xs,
  },
  cardsContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  nextCardPreview: {
    position: 'absolute',
    bottom: spacing.lg - 8,
    left: spacing.lg + 4,
    right: spacing.lg + 4,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    opacity: 0.5,
    zIndex: -1,
  },
  nextCardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.textSecondary,
  },
  footer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    alignItems: 'center',
  },
  actionText: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
