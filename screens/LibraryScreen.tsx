/**
 * Library Screen
 * View and manage saved articles with filters and search
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Article, getAllArticles, deleteArticle, updateArticle } from '../services/database';
import { formatDate, formatContent } from '../services/articleExtractor';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

interface ArticleWithActions extends Article {
  isUnread?: boolean;
  isFavorite?: boolean;
}

const LibraryScreen = ({ navigation }: any) => {
  const { getColors, getFontSize, settings } = useTheme();
  const currentColors = getColors();
  const fontSizeStyle = (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl') => ({ fontSize: getFontSize(size), fontFamily: settings.fontFamily === 'serif' ? 'serif' : 'sans-serif' });

  const [articles, setArticles] = useState<ArticleWithActions[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<ArticleWithActions[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');

  useFocusEffect(
    React.useCallback(() => {
      loadArticles();
    }, []),
  );

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, filter]);

  const loadArticles = async () => {
    const loaded = await getAllArticles();
    setArticles(loaded);
  };

  const filterArticles = () => {
    let results = articles;

    // Apply filter
    if (filter === 'unread') {
      results = results.filter(a => a.isUnread !== false);
    } else if (filter === 'favorites') {
      results = results.filter(a => a.isFavorite === true);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        a =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query) ||
          a.author?.toLowerCase().includes(query),
      );
    }

    setFilteredArticles(results);
  };

  const handleDeleteArticle = (id: string) => {
    deleteArticle(id).then(() => loadArticles());
  };

  const handleToggleFavorite = async (article: ArticleWithActions) => {
    await updateArticle(article.id, { isFavorite: !article.isFavorite });
    await loadArticles();
  };

  const handleArticlePress = (article: ArticleWithActions) => {
    navigation.navigate('ArticleDetail', { id: article.id });
  };

  const ArticleCard = ({ article }: { article: ArticleWithActions }) => (
    <TouchableOpacity
      style={[styles.articleCard, { backgroundColor: currentColors.surfaceLight, borderColor: currentColors.border }]}
      onPress={() => handleArticlePress(article)}
      activeOpacity={0.7}
    >
      <View style={styles.articleHeader}>
        <View style={styles.articleTitleContainer}>
          <Text style={[styles.articleTitle, { color: currentColors.text }, fontSizeStyle('base')]} numberOfLines={2}>
            {article.title}
          </Text>
          {article.isUnread && <View style={[styles.unreadBadge, { backgroundColor: currentColors.primary }]} />}
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleToggleFavorite(article)}
        >
          <Text style={styles.favoriteIcon}>{article.isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.articleAuthor, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>{article.author || 'Unknown Author'}</Text>

      <Text style={[styles.articleSummary, { color: currentColors.textSecondary }, fontSizeStyle('sm')]} numberOfLines={2}>
        {article.summary || formatContent(article.content, 100)}
      </Text>

      <View style={[styles.articleFooter, { borderTopColor: currentColors.border }]}>
        <Text style={[styles.articleDate, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>{formatDate(article.savedAt)}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteArticle(article.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.headerTitle, { color: currentColors.text }, fontSizeStyle('xxl')]}>Library</Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: currentColors.surfaceLight, borderColor: currentColors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: currentColors.text }]}
          placeholder="Search articles..."
          placeholderTextColor={currentColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'all' && { backgroundColor: currentColors.primary, borderColor: currentColors.primary },
            filter !== 'all' && { backgroundColor: currentColors.surfaceLight, borderColor: 'transparent' },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: filter === 'all' ? currentColors.text : currentColors.textSecondary },
              fontSizeStyle('sm')
            ]}
          >
            All ({articles.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'unread' && { backgroundColor: currentColors.primary, borderColor: currentColors.primary },
            filter !== 'unread' && { backgroundColor: currentColors.surfaceLight, borderColor: 'transparent' },
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: filter === 'unread' ? currentColors.text : currentColors.textSecondary },
              fontSizeStyle('sm')
            ]}
          >
            Unread ({articles.filter(a => a.isUnread !== false).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'favorites' && { backgroundColor: currentColors.primary, borderColor: currentColors.primary },
            filter !== 'favorites' && { backgroundColor: currentColors.surfaceLight, borderColor: 'transparent' },
          ]}
          onPress={() => setFilter('favorites')}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: filter === 'favorites' ? currentColors.text : currentColors.textSecondary },
              fontSizeStyle('sm')
            ]}
          >
            Favorites ({articles.filter(a => a.isFavorite).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={[styles.emptyTitle, { color: currentColors.text }, fontSizeStyle('lg')]}>No saved articles yet</Text>
            <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }, fontSizeStyle('sm')]}>Tap + to add your first article</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredArticles}
          renderItem={({ item }) => <ArticleCard article={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  searchIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.dark.text,
    fontSize: fontSize.base,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.dark.textSecondary,
  },
  filterTabTextActive: {
    color: colors.dark.text,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  articleCard: {
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  articleTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  articleTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.primary,
    marginTop: spacing.xs,
  },
  favoriteButton: {
    padding: spacing.sm,
  },
  favoriteIcon: {
    fontSize: fontSize.lg,
  },
  articleAuthor: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginBottom: spacing.sm,
  },
  articleSummary: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTopWidth: 1,
    borderTopColor: colors.dark.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  articleDate: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSize.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    textAlign: 'center',
  },
});

export default LibraryScreen;
