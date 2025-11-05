/**
 * Articles List Screen
 * Displays all saved articles with search and delete functionality
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  NativeModules,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Article, getAllArticles, deleteArticle, searchArticles } from '../services/database';
import { formatDate, formatContent } from '../services/articleExtractor';

export default function ArticlesScreen({ navigation }: any) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load articles when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [])
  );

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const allArticles = await getAllArticles();
      console.log('[ArticlesScreen] Loaded articles:', allArticles.length);
      setArticles(allArticles);
      setFilteredArticles(allArticles);
    } catch (error) {
      console.error('[ArticlesScreen] Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadArticles();
    setIsRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      setFilteredArticles(articles);
    } else {
      try {
        const results = await searchArticles(query);
        setFilteredArticles(results);
      } catch (error) {
        console.error('[ArticlesScreen] Error searching articles:', error);
      }
    }
  };

  const handleDeleteArticle = (articleId: string, articleTitle: string) => {
    Alert.alert(
      'Delete Article',
      `Are you sure you want to delete "${articleTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteArticle(articleId);
              loadArticles();
              Alert.alert('Success', 'Article deleted');
            } catch (error) {
              console.error('[ArticlesScreen] Error deleting article:', error);
              Alert.alert('Error', 'Failed to delete article');
            }
          },
        },
      ]
    );
  };

  const handleOpenArticle = (article: Article) => {
    navigation.navigate('ArticleDetail', {
      articleId: article.id,
      title: article.title,
    });
  };

  const renderArticleItem = ({ item }: { item: Article }) => (
    <TouchableOpacity
      style={styles.articleCard}
      onPress={() => handleOpenArticle(item)}
      activeOpacity={0.7}
    >
      <View style={styles.articleContent}>
        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.articleDate}>
          📅 {formatDate(item.savedAt)}
        </Text>

        {item.author && (
          <Text style={styles.articleAuthor}>
            👤 {item.author}
          </Text>
        )}

        {item.summary && (
          <Text style={styles.articleSummary} numberOfLines={2}>
            {formatContent(item.summary, 150)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteArticle(item.id, item.title)}
      >
        <Text style={styles.deleteEmoji}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={styles.emptyTitle}>No articles saved</Text>
      <Text style={styles.emptyText}>
        Share a URL from Chrome or any other app to save it here
      </Text>
    </View>
  );

  if (isLoading && articles.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196f3" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Text>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {filteredArticles.length === 0 && searchQuery !== '' && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No articles match "{searchQuery}"</Text>
        </View>
      )}

      <FlatList
        data={filteredArticles}
        renderItem={renderArticleItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={searchQuery === '' ? renderEmptyState : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 1,
    alignItems: 'flex-start',
  },
  articleContent: {
    flex: 1,
    marginRight: 12,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
  },
  articleDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  articleAuthor: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  articleSummary: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  deleteButton: {
    padding: 8,
    marginTop: 4,
  },
  deleteEmoji: {
    fontSize: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  noResultsContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
});
