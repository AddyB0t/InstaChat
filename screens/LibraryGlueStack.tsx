/**
 * Library Screen with GlueStack UI
 * Clean list view of saved articles
 */

import React, { useState, useMemo } from 'react';
import {
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Input,
  InputField,
  Pressable,
  ScrollView,
} from '@gluestack-ui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { getAllArticles, deleteArticle, updateArticle, Article } from '../services/database';
import { useTheme } from '../context/ThemeContext';

export default function LibraryGlueStack({ navigation }: any) {
  const { getColors } = useTheme();
  const currentColors = getColors();

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read' | 'bookmarked'>('all');

  useFocusEffect(
    React.useCallback(() => {
      loadArticles();
    }, [])
  );

  const loadArticles = async () => {
    try {
      setIsLoading(true);
      const allArticles = await getAllArticles();
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

  const filteredArticles = useMemo(() => {
    let result = articles;

    if (filterStatus === 'unread') {
      result = result.filter(a => a.isUnread);
    } else if (filterStatus === 'read') {
      result = result.filter(a => !a.isUnread);
    } else if (filterStatus === 'bookmarked') {
      result = result.filter(a => a.isBookmarked);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(query) ||
        (a.summary && a.summary.toLowerCase().includes(query))
      );
    }

    return result;
  }, [articles, searchQuery, filterStatus]);

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

  const handleToggleBookmark = async (article: Article) => {
    try {
      const newBookmarkStatus = !article.isBookmarked;
      await updateArticle(article.id, { isBookmarked: newBookmarkStatus });
      setArticles(articles.map(a =>
        a.id === article.id ? { ...a, isBookmarked: newBookmarkStatus } : a
      ));
    } catch (error) {
      console.error('[Library] Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  const handleArticlePress = (article: Article) => {
    navigation.navigate('ArticleDetail', {
      articleId: article.id,
      title: article.title,
    });
  };

  const ArticleRow = ({ article }: { article: Article }) => (
    <Pressable
      onPress={() => handleArticlePress(article)}
      mb="$3"
      borderRadius="$lg"
      overflow="hidden"
      borderLeftWidth={4}
      borderLeftColor={article.isUnread ? '$primary500' : '$borderLight200'}
      bg={article.isUnread ? '$backgroundLight0' : '$backgroundLight100'}
      sx={{
        _dark: {
          bg: article.isUnread ? '$backgroundDark900' : '$backgroundDark800',
          borderLeftColor: article.isUnread ? '$primary500' : '$borderDark700',
        }
      }}
    >
      <HStack>
        {article.imageUrl && (
          <Image
            source={{ uri: article.imageUrl }}
            style={{ width: 80, height: 100 }}
          />
        )}

        <VStack flex={1} p="$3" space="xs">
          <HStack justifyContent="space-between" alignItems="flex-start">
            <Text
              flex={1}
              size="md"
              fontWeight="$semibold"
              color="$textLight900"
              sx={{ _dark: { color: '$white' } }}
              numberOfLines={2}
            >
              {article.title}
            </Text>
            {article.isUnread && (
              <Box w={8} h={8} bg="$primary500" borderRadius="$full" ml="$2" mt="$2" />
            )}
          </HStack>

          <Text
            size="xs"
            color="$textLight500"
            sx={{ _dark: { color: '$textDark400' } }}
            numberOfLines={2}
          >
            {article.summary || 'No description'}
          </Text>

          {article.tags && article.tags.length > 0 && (
            <HStack flexWrap="wrap" gap="$1">
              {article.tags.map((tag, index) => (
                <Box
                  key={index}
                  px="$2"
                  py="$1"
                  borderRadius="$sm"
                  borderWidth={1}
                  borderColor="$primary500"
                  sx={{ _dark: { borderColor: '$primary600' } }}
                >
                  <Text
                    size="xs"
                    color="$primary500"
                    sx={{ _dark: { color: '$primary400' } }}
                  >
                    #{tag}
                  </Text>
                </Box>
              ))}
            </HStack>
          )}

          <HStack justifyContent="space-between" alignItems="center" mt="$2">
            <Text size="xs" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }}>
              {new Date(article.savedAt).toLocaleDateString()}
            </Text>
            <HStack space="sm">
              <TouchableOpacity onPress={() => handleToggleBookmark(article)}>
                <Text style={{ fontSize: 18 }}>{article.isBookmarked ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteArticle(article.id)}>
                <Text style={{ fontSize: 16 }}>🗑️</Text>
              </TouchableOpacity>
            </HStack>
          </HStack>
        </VStack>
      </HStack>
    </Pressable>
  );

  const unreadCount = articles.filter(a => a.isUnread).length;

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
            No articles
          </Text>
          <Text size="sm" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }} textAlign="center">
            Your library is empty. Share URLs or use the Add tab to save articles
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark900' } }}>
      {/* Header */}
      <Box p="$4" borderBottomWidth={1} borderBottomColor="$borderLight200" sx={{ _dark: { borderBottomColor: '$borderDark700' } }}>
        <Text size="3xl" fontWeight="$bold" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
          Library
        </Text>
        <Text size="sm" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }}>
          {unreadCount} unread • {articles.length} total
        </Text>
      </Box>

      {/* Search Bar */}
      <Box p="$4" bg="$backgroundLight50" sx={{ _dark: { bg: '$backgroundDark950' } }}>
        <Input variant="outline" size="md">
          <InputField
            placeholder="Search articles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Input>
      </Box>

      {/* Filter Buttons */}
      <HStack p="$4" space="sm">
        {(['all', 'unread', 'read', 'bookmarked'] as const).map((status) => (
          <Pressable
            key={status}
            flex={1}
            onPress={() => setFilterStatus(status)}
            py="$2"
            px="$2"
            borderRadius="$lg"
            alignItems="center"
            bg={filterStatus === status ? '$primary500' : '$backgroundLight200'}
            sx={{
              _dark: {
                bg: filterStatus === status ? '$primary600' : '$backgroundDark700',
              }
            }}
          >
            <Text
              size="xs"
              fontWeight="$semibold"
              color={filterStatus === status ? '$white' : '$textLight700'}
              sx={{
                _dark: {
                  color: filterStatus === status ? '$white' : '$textDark300',
                }
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </Pressable>
        ))}
      </HStack>

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <Box flex={1} alignItems="center" justifyContent="center">
          <VStack space="md" alignItems="center">
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text size="xl" fontWeight="$bold" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
              No articles found
            </Text>
            <Text size="sm" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }} textAlign="center">
              {searchQuery ? 'Try a different search' : 'No articles match this filter'}
            </Text>
          </VStack>
        </Box>
      ) : (
        <FlatList
          data={filteredArticles}
          renderItem={({ item }) => <ArticleRow article={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentColors.primary} />
          }
        />
      )}
    </Box>
  );
};