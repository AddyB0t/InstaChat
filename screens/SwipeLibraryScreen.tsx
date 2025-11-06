/**
 * Library Screen - Static List View
 * Displays all articles (read and unread) with read/unread status indicators
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllArticles, deleteArticle, Article } from '../services/database';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

export default function SwipeLibraryScreen({ navigation }: any) {
  const { getColors } = useTheme();
  const currentColors = getColors();

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadArticles();
    }, [])
  );

  const loadArticles = async () => {
    try {
      setIsLoading(true);
      const allArticles = await getAllArticles();
      // Sort: unread first, then by saved date (newest first)
      const sorted = allArticles.sort((a, b) => {
        if (a.isUnread === b.isUnread) {
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        }
        return a.isUnread ? -1 : 1;
      });
      setArticles(sorted);
    } catch (error) {
      console.error('[Library] Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const handleDeleteArticle = async (articleId: string) => {
    try {
      await deleteArticle(articleId);
      setArticles(articles.filter(a => a.id !== articleId));
      Alert.alert('Success', 'Article deleted');
    } catch (error) {
      console.error('[Library] Error deleting article:', error);
      Alert.alert('Error', 'Failed to delete article');
    }
  };

  const handleArticlePress = (article: Article) => {
    navigation.navigate('ArticleDetail', {
      articleId: article.id,
      title: article.title,
    });
  };

  const ArticleRow = ({ article }: { article: Article }) => (
    <TouchableOpacity
      style={[
        styles.articleRow,
        {
          backgroundColor: article.isUnread ? currentColors.surface : currentColors.surfaceLight,
          borderLeftColor: article.isUnread ? currentColors.primary : currentColors.border,
        },
      ]}
      onPress={() => handleArticlePress(article)}
    >
      {/* Article Image */}
      {article.imageUrl && (
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.articleImage}
        />
      )}

      {/* Article Content */}
      <View style={styles.articleContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.articleTitle, { color: currentColors.text }]} numberOfLines={2}>
            {article.title}
          </Text>
          {article.isUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: currentColors.primary }]} />
          )}
        </View>

        <Text style={[styles.articleSummary, { color: currentColors.textSecondary }]} numberOfLines={2}>
          {article.summary || 'No description'}
        </Text>

        <View style={styles.articleFooter}>
          <Text style={[styles.articleDate, { color: currentColors.textSecondary }]}>
            {new Date(article.savedAt).toLocaleDateString()}
          </Text>
          <TouchableOpacity
            onPress={() => handleDeleteArticle(article.id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={[styles.emptyTitle, { color: currentColors.text }]}>No articles</Text>
          <Text style={[styles.emptyDescription, { color: currentColors.textSecondary }]}>
            Your library is empty. Share URLs or use the Add tab to save articles
          </Text>
        </View>
      </View>
    );
  }

  // Count unread articles
  const unreadCount = articles.filter(a => a.isUnread).length;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.title, { color: currentColors.text }]}>Library</Text>
        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
          {unreadCount} unread • {articles.length} total
        </Text>
      </View>

      <FlatList
        data={articles}
        renderItem={({ item }) => <ArticleRow article={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentColors.primary} />
        }
      />
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
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  articleRow: {
    flexDirection: 'row',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: colors.dark.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  articleImage: {
    width: 80,
    height: 100,
    backgroundColor: colors.dark.surfaceLight,
  },
  articleContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  articleTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.primary,
    marginLeft: spacing.sm,
    marginTop: 6,
  },
  articleSummary: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleDate: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  deleteButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  deleteIcon: {
    fontSize: 16,
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
