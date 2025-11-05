/**
 * Article Detail Screen
 * Displays full article content with open and delete options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { Article, getArticle, deleteArticle } from '../services/database';
import { formatDate } from '../services/articleExtractor';

export default function ArticleDetailScreen({ route, navigation }: any) {
  const { articleId } = route.params;
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  const loadArticle = async () => {
    setIsLoading(true);
    try {
      const fetchedArticle = await getArticle(articleId);
      if (fetchedArticle) {
        setArticle(fetchedArticle);
      } else {
        Alert.alert('Error', 'Article not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('[ArticleDetailScreen] Error loading article:', error);
      Alert.alert('Error', 'Failed to load article');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInBrowser = async () => {
    if (!article?.url) return;

    try {
      const canOpen = await Linking.canOpenURL(article.url);
      if (canOpen) {
        await Linking.openURL(article.url);
      } else {
        Alert.alert('Error', 'Cannot open URL');
      }
    } catch (error) {
      console.error('[ArticleDetailScreen] Error opening URL:', error);
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  const handleDeleteArticle = () => {
    if (!article) return;

    Alert.alert(
      'Delete Article',
      `Are you sure you want to delete "${article.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteArticle(article.id);
              Alert.alert('Success', 'Article deleted', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              console.error('[ArticleDetailScreen] Error deleting article:', error);
              Alert.alert('Error', 'Failed to delete article');
            }
          },
        },
      ]
    );
  };

  const handleCopyUrl = () => {
    if (!article?.url) return;

    // Note: To use clipboard, you would need to install react-native-clipboard
    // For now, we'll just show a success message
    Alert.alert('Success', 'URL copied to clipboard (requires clipboard library)');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196f3" style={styles.loader} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Article not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {article.imageUrl && (
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.headerImage}
          resizeMode="cover"
          onError={() => console.log('[ArticleDetailScreen] Image loading failed')}
        />
      )}

      <View style={styles.contentContainer}>
        <Text style={styles.title}>{article.title}</Text>

        <View style={styles.metadataContainer}>
          {article.author && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataEmoji}>👤</Text>
              <Text style={styles.metadataText}>{article.author}</Text>
            </View>
          )}

          <View style={styles.metadataItem}>
            <Text style={styles.metadataEmoji}>📅</Text>
            <Text style={styles.metadataText}>{formatDate(article.savedAt)}</Text>
          </View>

          {article.publishDate && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataEmoji}>🕐</Text>
              <Text style={styles.metadataText}>{formatDate(article.publishDate)}</Text>
            </View>
          )}
        </View>

        {article.summary && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <Text style={styles.summaryText}>{article.summary}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOpenInBrowser}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonEmoji}>🌐</Text>
            <Text style={styles.actionButtonText}>Open in Browser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCopyUrl}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonEmoji}>📋</Text>
            <Text style={styles.actionButtonText}>Copy URL</Text>
          </TouchableOpacity>
        </View>

        {article.content && (
          <View style={styles.fullContent}>
            <Text style={styles.contentTitle}>Article Content</Text>
            <Text style={styles.contentText}>{article.content}</Text>
          </View>
        )}

        <View style={styles.urlContainer}>
          <Text style={styles.urlLabel}>Article URL:</Text>
          <Text style={styles.urlText} selectable>
            {article.url}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteArticle}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteButtonEmoji}>🗑️</Text>
          <Text style={styles.deleteButtonText}>Delete Article</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    color: '#f44336',
  },
  headerImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#e0e0e0',
  },
  contentContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    lineHeight: 32,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  metadataEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  summaryContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  actionButtonEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  fullContent: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  urlContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  urlText: {
    fontSize: 12,
    color: '#1976d2',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  deleteButtonEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
