/**
 * SearchScreen
 * Search and browse all bookmarked articles in a Momentum-style list view
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  FlatList,
  useColorScheme,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Article, getAllArticles } from '../services/database';
import { useTheme } from '../context/ThemeContext';
import { wp, hp, fp, ms } from '../utils/responsive';

interface SearchScreenProps {
  navigation: any;
  route?: {
    params?: {
      filter?: 'all' | 'starred' | 'bookmarked';
      viewMode?: 'list' | 'grid';
    };
  };
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, route }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(route?.params?.viewMode || 'list');
  const filter = route?.params?.filter || 'all';

  const systemColorScheme = useColorScheme();
  const { settings, getThemedColors } = useTheme();

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  const colors = getThemedColors(isDark);

  // Navigation bar renderer - same icons as Home screen
  const renderNavBar = () => (
    <View style={styles.navBarContainer}>
      <TouchableOpacity
        style={[styles.navBarButton, { backgroundColor: colors.accent.primary }]}
        onPress={() => {}}
      >
        <Icon name="grid" size={ms(18)} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navBarButton, { backgroundColor: colors.background.secondary }]}
        onPress={() => navigation.navigate('Home')}
      >
        <Icon name="layers" size={ms(18)} color={colors.accent.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navBarButton, { backgroundColor: colors.background.secondary }]}
        onPress={() => navigation.navigate('Home')}
      >
        <Icon name="create" size={ms(18)} color={colors.accent.primary} />
      </TouchableOpacity>
    </View>
  );

  // Load articles
  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      const allArticles = await getAllArticles();

      // Filter based on filter param
      let filtered = allArticles;
      if (filter === 'starred') {
        filtered = allArticles.filter(a => a.isFavorite === true);
      } else if (filter === 'bookmarked') {
        filtered = allArticles.filter(a => a.isBookmarked === true);
      }

      // Apply platform filter from settings (only when not in bookmarked/starred view)
      if (filter === 'all') {
        const platformFilter = settings.platformFilter;
        if (platformFilter && platformFilter !== 'all') {
          const platforms = platformFilter.split(',').map(p => p.trim().toLowerCase());
          filtered = filtered.filter(a => {
            const articlePlatform = (a.platform || 'web').toLowerCase();
            return platforms.includes(articlePlatform);
          });
        }
      }

      // Sort based on settings
      const sortBy = settings.sortBy || 'date';
      const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'date') {
          // New Arrivals - newest first
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        } else {
          // Vintage - oldest first
          return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
        }
      });

      setArticles(sorted);
      setFilteredArticles(sorted);
    } catch (error) {
      console.error('[SearchScreen] Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, settings.platformFilter, settings.sortBy]);

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles])
  );

  // Filter articles based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredArticles(articles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = articles.filter(article => {
      // Search in title
      if (article.title.toLowerCase().includes(query)) return true;

      // Search in content
      if (article.content.toLowerCase().includes(query)) return true;

      // Search in summary
      if (article.aiSummary?.toLowerCase().includes(query)) return true;
      if (article.summary?.toLowerCase().includes(query)) return true;

      // Search in tags
      if (article.tags?.some(tag => tag.toLowerCase().includes(query))) return true;

      return false;
    });

    setFilteredArticles(filtered);
  }, [searchQuery, articles]);

  // Handle article press
  const handleArticlePress = (article: Article) => {
    navigation.navigate('ArticleDetail', { articleId: article.id });
  };

  // Render article item - List view (matching grid style)
  const renderArticleItem = ({ item }: { item: Article }) => (
    <TouchableOpacity
      style={[styles.articleCard, { backgroundColor: colors.background.secondary }]}
      onPress={() => handleArticlePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardCategory, { color: colors.text.tertiary }]}>
          {item.platform || 'Article'}
        </Text>
        {item.isBookmarked && (
          <Icon name="bookmark" size={ms(14)} color="#F59E0B" />
        )}
      </View>
      <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardAction, { color: colors.text.tertiary }]}>
          {item.readingTimeMinutes || 5} min
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render article item - Grid view
  const renderGridItem = ({ item }: { item: Article }) => (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: colors.background.secondary }]}
      onPress={() => handleArticlePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.gridCardHeader}>
        <Text style={[styles.gridCategory, { color: colors.text.tertiary }]} numberOfLines={1}>
          {item.platform || 'Article'}
        </Text>
        {item.isBookmarked && (
          <Icon name="bookmark" size={ms(12)} color="#F59E0B" />
        )}
      </View>
      <Text style={[styles.gridTitle, { color: colors.text.primary }]} numberOfLines={3}>
        {item.title}
      </Text>
      <View style={styles.gridFooter}>
        <Text style={[styles.gridAction, { color: colors.text.tertiary }]}>
          {item.readingTimeMinutes || 5} min
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            Loading articles...
          </Text>
        </View>
      );
    }

    if (searchQuery.trim() && filteredArticles.length === 0) {
      return (
        <View style={styles.centered}>
          <Icon name="search" size={ms(56)} color={colors.text.tertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            No results found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.tertiary }]}>
            Try searching with different keywords
          </Text>
        </View>
      );
    }

    if (articles.length === 0) {
      const isBookmarked = filter === 'bookmarked';
      const isStarred = filter === 'starred';
      return (
        <View style={styles.centered}>
          <Icon
            name={isBookmarked ? 'bookmark' : isStarred ? 'star' : 'library'}
            size={ms(56)}
            color={isBookmarked || isStarred ? '#F59E0B' : colors.accent.primary}
          />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            {isBookmarked ? 'No bookmarked articles' : isStarred ? 'No starred articles' : 'No articles yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.tertiary }]}>
            {isBookmarked
              ? 'Bookmark articles to add them here for quick access'
              : isStarred
              ? 'Star articles to add them here for quick access'
              : 'Start saving articles by sharing URLs to this app'}
          </Text>
        </View>
      );
    }

    return null;
  };

  // Use theme colors for background
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Momentum Header */}
      <View style={styles.header}>
          <View style={styles.headerLeft}>
            {filter !== 'all' && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={ms(24)} color={colors.text.primary} />
              </TouchableOpacity>
            )}
            <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
              {filter === 'starred' ? 'Starred' : filter === 'bookmarked' ? 'Bookmarked' : 'Library'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.viewModeButton, { backgroundColor: colors.background.secondary }]}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              <Icon
                name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
                size={ms(20)}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background.secondary }]}>
          <Icon name="search" size={ms(18)} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search articles..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={ms(18)} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Articles List/Grid */}
        <FlatList
          data={filteredArticles}
          renderItem={viewMode === 'grid' ? renderGridItem : renderArticleItem}
          keyExtractor={item => item.id}
          contentContainerStyle={viewMode === 'grid' ? styles.gridContent : styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        />

      {/* Navigation bar - only show when not filtered */}
      {filter === 'all' && (
        <View style={styles.navBarWrapper}>
          {renderNavBar()}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(20),
    paddingTop: hp(16),
    paddingBottom: hp(12),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: wp(12),
    padding: wp(4),
  },
  headerTitle: {
    fontSize: fp(28),
    fontWeight: '700',
    color: '#111827',
  },
  headerTitleDark: {
    color: '#F9FAFB',
  },
  viewModeButton: {
    padding: wp(10),
    borderRadius: ms(12),
  },
  clearAllButton: {
    paddingHorizontal: wp(8),
    paddingVertical: hp(4),
  },
  clearAllText: {
    fontSize: fp(13),
    color: '#6B7280',
    fontWeight: '500',
  },
  clearAllTextDark: {
    color: '#9CA3AF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(20),
    marginBottom: hp(12),
    paddingHorizontal: wp(14),
    paddingVertical: hp(12),
    borderRadius: ms(14),
  },
  searchIcon: {
    marginRight: wp(10),
  },
  searchInput: {
    flex: 1,
    fontSize: fp(14),
    padding: 0,
  },
  listContent: {
    paddingHorizontal: wp(20),
    paddingBottom: hp(120),
  },
  gridContent: {
    paddingHorizontal: wp(16),
    paddingBottom: hp(120),
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    borderRadius: ms(14),
    padding: wp(14),
    marginBottom: hp(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(2) },
    shadowOpacity: 0.08,
    shadowRadius: ms(8),
    elevation: 3,
    minHeight: hp(140),
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(8),
  },
  gridCategory: {
    fontSize: fp(10),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  gridTitle: {
    fontSize: fp(14),
    fontWeight: '600',
    lineHeight: fp(20),
    flex: 1,
  },
  gridFooter: {
    marginTop: 'auto',
    paddingTop: hp(10),
  },
  gridAction: {
    fontSize: fp(11),
    fontWeight: '500',
  },
  articleCard: {
    borderRadius: ms(14),
    padding: wp(16),
    marginBottom: hp(12),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(6),
  },
  cardCategory: {
    fontSize: fp(10),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: fp(15),
    fontWeight: '600',
    lineHeight: fp(21),
    marginBottom: hp(10),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAction: {
    fontSize: fp(11),
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(40),
    marginTop: hp(80),
  },
  emptyIcon: {
    fontSize: fp(56),
    marginBottom: hp(12),
  },
  emptyTitle: {
    fontSize: fp(18),
    fontWeight: '700',
    color: '#111827',
    marginBottom: hp(6),
    textAlign: 'center',
  },
  emptyTitleDark: {
    color: '#F9FAFB',
  },
  emptySubtitle: {
    fontSize: fp(14),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: fp(20),
  },
  emptySubtitleDark: {
    color: '#9CA3AF',
  },
  emptyText: {
    fontSize: fp(14),
    color: '#6B7280',
    marginTop: hp(10),
  },
  emptyTextDark: {
    color: '#9CA3AF',
  },
  navBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: wp(20),
    paddingBottom: hp(20),
  },
  navBarContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(10),
  },
  navBarButton: {
    flex: 1,
    paddingVertical: hp(10),
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(2) },
    shadowOpacity: 0.1,
    shadowRadius: ms(4),
    elevation: 2,
  },
});
