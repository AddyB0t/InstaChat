/**
 * Browse Screen with GlueStack UI
 * Swipe card interface using GlueStack components
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { getAllArticles, Article, updateArticle } from '../services/database';
import { SwipeCard } from '../components/SwipeCard';
import { useTheme } from '../context/ThemeContext';

export default function BrowseGlueStack({ navigation }: any) {
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
      <Box flex={1} bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark900' } }} alignItems="center" justifyContent="center">
        <ActivityIndicator size="large" color={currentColors.primary} />
      </Box>
    );
  }

  if (articles.length === 0) {
    return (
      <Box flex={1} bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark900' } }} alignItems="center" justifyContent="center" p="$8">
        <VStack space="md" alignItems="center">
          <Text style={{ fontSize: 48 }}>📚</Text>
          <Text size="2xl" fontWeight="$bold" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
            No unread articles
          </Text>
          <Text size="sm" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }} textAlign="center">
            Share URLs or use the Add tab to save articles
          </Text>
        </VStack>
      </Box>
    );
  }

  if (currentIndex >= articles.length) {
    return (
      <Box flex={1} bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark900' } }} alignItems="center" justifyContent="center" p="$8">
        <VStack space="md" alignItems="center">
          <Text style={{ fontSize: 48 }}>✨</Text>
          <Text size="2xl" fontWeight="$bold" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
            All caught up!
          </Text>
          <Text size="sm" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }} textAlign="center">
            You've reviewed all {articles.length} unread articles
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark900' } }}>
      {/* Header */}
      <Box py="$4" px="$6" alignItems="center" borderBottomWidth={2} borderBottomColor="$primary500">
        <Text size="3xl" fontWeight="$bold" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
          Home
        </Text>
        <Text size="sm" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }}>
          {currentIndex + 1} of {articles.length}
        </Text>
      </Box>

      {/* Cards Container */}
      <Box flex={1} p="$6" justifyContent="center">
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
          <Box
            position="absolute"
            bottom={8}
            left={24}
            right={24}
            zIndex={-1}
            bg="$backgroundLight200"
            sx={{ _dark: { bg: '$backgroundDark800' } }}
            p="$3"
            borderRadius="$lg"
            opacity={0.5}
          >
            <Text
              size="md"
              fontWeight="$semibold"
              color="$textLight700"
              sx={{ _dark: { color: '$textDark300' } }}
              numberOfLines={1}
            >
              {articles[currentIndex + 1].title}
            </Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box py="$3" px="$6" alignItems="center" justifyContent="center" borderTopWidth={1} borderTopColor="$borderLight200" sx={{ _dark: { borderTopColor: '$borderDark800' } }}>
        <Text size="xs" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }} textAlign="center">
          ← Next Article • Open Link →
        </Text>
      </Box>
    </Box>
  );
}