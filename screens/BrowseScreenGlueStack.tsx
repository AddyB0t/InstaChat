/**
 * Browse Screen with GlueStack UI
 * Tinder-style swiping for unread articles using GlueStack components
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllArticles, Article, updateArticle } from '../services/database';
import { SwipeCard } from '../components/SwipeCard';
import { useTheme } from '../context/ThemeContext';
import { GlueStackBox } from '../components/GlueStackBox';
import { GlueStackText } from '../components/GlueStackText';

export default function BrowseScreenGlueStack({ navigation }: any) {
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
        .filter(a => a.isUnread !== false)
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setArticles(unreadArticles);
      setCurrentIndex(0);
    } catch (error) {
      console.error('[BrowseScreen] Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipeLeft = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % articles.length);
  };

  const handleSwipeRight = async () => {
    if (currentIndex >= articles.length) return;

    const article = articles[currentIndex];
    try {
      await updateArticle(article.id, { isUnread: false });

      if (article.url) {
        try {
          const canOpen = await Linking.canOpenURL(article.url);
          if (canOpen) {
            await Linking.openURL(article.url);
          } else {
            await Linking.openURL(article.url);
          }
        } catch (linkError) {
          console.error('[BrowseScreen] Error opening URL:', linkError);
        }
      }
    } catch (error) {
      console.error('[BrowseScreen] Error:', error);
    } finally {
      setTimeout(() => {
        loadArticles();
      }, 400);
    }
  };

  const handleTap = () => {
    if (currentIndex < articles.length) {
      const article = articles[currentIndex];
      navigation.navigate('ArticleDetail', { articleId: article.id, title: article.title });
    }
  };

  if (isLoading && articles.length === 0) {
    return (
      <GlueStackBox flex={1} bg="background" justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color={currentColors.primary} />
      </GlueStackBox>
    );
  }

  if (articles.length === 0) {
    return (
      <GlueStackBox flex={1} bg="background" justifyContent="center" alignItems="center" px={32}>
        <GlueStackText size="2xl" style={{ marginBottom: 16 }}>📚</GlueStackText>
        <GlueStackText size="xl" weight="600" style={{ marginBottom: 8 }}>
          No unread articles
        </GlueStackText>
        <GlueStackText size="sm" color="textSecondary" textAlign="center">
          Share URLs or use the Add tab to save articles
        </GlueStackText>
      </GlueStackBox>
    );
  }

  if (currentIndex >= articles.length) {
    return (
      <GlueStackBox flex={1} bg="background" justifyContent="center" alignItems="center" px={32}>
        <GlueStackText size="2xl" style={{ marginBottom: 16 }}>✨</GlueStackText>
        <GlueStackText size="xl" weight="600" style={{ marginBottom: 8 }}>
          All caught up!
        </GlueStackText>
        <GlueStackText size="sm" color="textSecondary" textAlign="center">
          You've reviewed all {articles.length} unread articles
        </GlueStackText>
      </GlueStackBox>
    );
  }

  return (
    <GlueStackBox flex={1} bg="background">
      {/* Header */}
      <GlueStackBox
        py={16}
        px={24}
        alignItems="center"
        borderBottomWidth={2}
        borderColor={currentColors.primary}
      >
        <GlueStackText size="2xl" weight="700">
          Home
        </GlueStackText>
        <GlueStackText size="sm" color="textSecondary" style={{ marginTop: 4 }}>
          {currentIndex + 1} of {articles.length}
        </GlueStackText>
      </GlueStackBox>

      {/* Cards Container */}
      <GlueStackBox flex={1} p={24} justifyContent="center">
        {/* Current Card */}
        {currentIndex < articles.length && (
          <SwipeCard
            key={articles[currentIndex].id}
            article={articles[currentIndex]}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={handleTap}
          />
        )}

        {/* Next Card Preview */}
        {currentIndex + 1 < articles.length && (
          <GlueStackBox
            style={[
              styles.nextCardPreview,
              { backgroundColor: currentColors.surface, opacity: 0.5 },
            ]}
            p={12}
            rounded="lg"
          >
            <GlueStackText
              size="base"
              weight="600"
              color="textSecondary"
              numberOfLines={1}
            >
              {articles[currentIndex + 1].title}
            </GlueStackText>
          </GlueStackBox>
        )}
      </GlueStackBox>

      {/* Footer */}
      <GlueStackBox
        py={12}
        px={24}
        alignItems="center"
        borderTopWidth={1}
        borderColor={currentColors.border}
      >
        <GlueStackText size="xs" color="textSecondary" textAlign="center">
          ← Next Article • Open Link →
        </GlueStackText>
      </GlueStackBox>
    </GlueStackBox>
  );
}

const styles = StyleSheet.create({
  nextCardPreview: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    zIndex: -1,
  },
});
