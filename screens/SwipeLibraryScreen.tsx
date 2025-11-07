/**
 * Swipe Library Screen
 * Tinder-style card swiping interface for managing articles
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllArticles, deleteArticle, Article } from '../services/database';
import { SwipeCard } from '../components/SwipeCard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

export default function SwipeLibraryScreen({ navigation }: any) {
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
      // Sort by newest first
      const sorted = allArticles.sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
      setArticles(sorted);
      setCurrentIndex(0);
    } catch (error) {
      console.error('[SwipeLibrary] Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipeLeft = async () => {
    // Swipe left = next article
    if (currentIndex < articles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    // Swipe right = open article link (navigate to detail)
    if (articles[currentIndex]) {
      navigation.navigate('ArticleDetail', {
        articleId: articles[currentIndex].id,
        title: articles[currentIndex].title,
      });
    }
  };

  const handleTap = () => {
    // Tap card = open article detail
    if (articles[currentIndex]) {
      navigation.navigate('ArticleDetail', {
        articleId: articles[currentIndex].id,
        title: articles[currentIndex].title,
      });
    }
  };

  const handleNextCard = () => {
    if (currentIndex < articles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (isLoading) {
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
          <Text style={[styles.emptyTitle, { color: currentColors.text }]}>No Articles</Text>
          <Text style={[styles.emptyDescription, { color: currentColors.textSecondary }]}>
            Your library is empty. Share URLs to get started!
          </Text>
        </View>
      </View>
    );
  }

  const currentArticle = articles[currentIndex];
  const isLastCard = currentIndex === articles.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* Header with progress */}
      <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.title, { color: currentColors.text }]}>Library</Text>
        <Text style={[styles.progress, { color: currentColors.textSecondary }]}>
          {currentIndex + 1} of {articles.length}
        </Text>
      </View>

      {/* Swipe Cards Area */}
      <View style={styles.cardsContainer}>
        {/* Current Card */}
        {currentArticle && (
          <SwipeCard
            key={currentArticle.id}
            article={currentArticle}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={handleTap}
          />
        )}

        {/* Next Card Preview (underneath) */}
        {!isLastCard && articles[currentIndex + 1] && (
          <View style={[styles.nextCardPreview, { backgroundColor: currentColors.surface }]}>
            <Text style={[styles.nextCardText, { color: currentColors.textSecondary }]}>
              {articles[currentIndex + 1].title}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      {isLastCard ? (
        <View style={[styles.footer, { borderTopColor: currentColors.border }]}>
          <Text style={[styles.footerText, { color: currentColors.textSecondary }]}>
            🎉 All caught up!
          </Text>
        </View>
      ) : (
        <View style={[styles.footer, { borderTopColor: currentColors.border }]}>
          <Text style={[styles.instructionText, { color: currentColors.textSecondary }]}>
            👈 Swipe Left for Next • Swipe Right to Open 👉
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  progress: {
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
    bottom: spacing.lg - 10,
    left: spacing.lg,
    right: spacing.lg,
    height: 80,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    zIndex: -1,
  },
  nextCardText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    fontWeight: fontWeight.semibold,
    numberOfLines: 2,
  },
  footer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  footerText: {
    fontSize: fontSize.base,
    color: colors.dark.textSecondary,
    fontWeight: fontWeight.semibold,
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
