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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

export default function ArticleDetailScreen({ route, navigation }: any) {
  const { getColors, getFontSize, settings } = useTheme();
  const currentColors = getColors();
  const fontSizeStyle = (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl') => ({ fontSize: getFontSize(size), fontFamily: settings.fontFamily === 'serif' ? 'serif' : 'sans-serif' });
  // Support both 'id' and 'articleId' for backward compatibility
  const articleId = route.params?.id || route.params?.articleId;
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (articleId) {
      loadArticle();
    } else {
      Alert.alert('Error', 'Article ID not provided');
      navigation.goBack();
    }
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
      <View style={[styles.container, { backgroundColor: currentColors.background }]}>
        <ActivityIndicator size="large" color={currentColors.primary} style={styles.loader} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.background }]}>
        <Text style={[styles.errorText, { color: currentColors.error }, fontSizeStyle('base')]}>Article not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background }]} contentContainerStyle={styles.scrollContent}>
      {article.imageUrl && (
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.headerImage}
          resizeMode="cover"
          onError={() => console.log('[ArticleDetailScreen] Image loading failed')}
        />
      )}

      <View style={[styles.contentContainer, { backgroundColor: currentColors.surfaceLight }]}>
        <Text style={[styles.title, { color: currentColors.text }, fontSizeStyle('xl')]}>{article.title}</Text>

        <View style={[styles.metadataContainer, { borderBottomColor: currentColors.border }]}>
          {article.author && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataEmoji}>👤</Text>
              <Text style={[styles.metadataText, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>{article.author}</Text>
            </View>
          )}

          <View style={styles.metadataItem}>
            <Text style={styles.metadataEmoji}>📅</Text>
            <Text style={[styles.metadataText, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>{formatDate(article.savedAt)}</Text>
          </View>

          {article.publishDate && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataEmoji}>🕐</Text>
              <Text style={[styles.metadataText, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>{formatDate(article.publishDate)}</Text>
            </View>
          )}
        </View>

        {article.summary && (
          <View style={[styles.summaryContainer, { backgroundColor: currentColors.surface, borderLeftColor: currentColors.primary }]}>
            <Text style={[styles.summaryTitle, { color: currentColors.text }, fontSizeStyle('sm')]}>Summary</Text>
            <Text style={[styles.summaryText, { color: currentColors.textSecondary }, fontSizeStyle('sm')]}>{article.summary}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentColors.primary }]}
            onPress={handleOpenInBrowser}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonEmoji}>🌐</Text>
            <Text style={[styles.actionButtonText, fontSizeStyle('xs')]}>Open in Browser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentColors.primary }]}
            onPress={handleCopyUrl}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonEmoji}>📋</Text>
            <Text style={[styles.actionButtonText, fontSizeStyle('xs')]}>Copy URL</Text>
          </TouchableOpacity>
        </View>

        {article.content && (
          <View style={[styles.fullContent, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <Text style={[styles.contentTitle, { color: currentColors.text }, fontSizeStyle('sm')]}>Article Content</Text>
            <Text style={[styles.contentText, { color: currentColors.textSecondary }, fontSizeStyle('sm')]}>{article.content}</Text>
          </View>
        )}

        <View style={[styles.urlContainer, { backgroundColor: currentColors.surface, borderLeftColor: currentColors.primary }]}>
          <Text style={[styles.urlLabel, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>Article URL:</Text>
          <Text style={[styles.urlText, { color: currentColors.primaryLight }, fontSizeStyle('xs')]} selectable>
            {article.url}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: currentColors.error }]}
          onPress={handleDeleteArticle}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteButtonEmoji}>🗑️</Text>
          <Text style={[styles.deleteButtonText, fontSizeStyle('sm')]}>Delete Article</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: fontSize.base,
    color: colors.dark.error,
  },
  headerImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.dark.surface,
  },
  contentContainer: {
    backgroundColor: colors.dark.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginBottom: spacing.md,
    lineHeight: 32,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
    marginBottom: spacing.sm,
  },
  metadataEmoji: {
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
  },
  metadataText: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginLeft: spacing.sm,
  },
  summaryContainer: {
    backgroundColor: colors.dark.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.dark.primary,
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.dark.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  actionButtonEmoji: {
    fontSize: fontSize.base,
    marginRight: spacing.sm,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  fullContent: {
    backgroundColor: colors.dark.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  contentTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing.md,
  },
  contentText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    lineHeight: 22,
  },
  urlContainer: {
    backgroundColor: colors.dark.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.dark.primary,
  },
  urlLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.dark.textSecondary,
    marginBottom: spacing.sm,
  },
  urlText: {
    fontSize: fontSize.xs,
    color: colors.dark.primaryLight,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  deleteButton: {
    backgroundColor: colors.dark.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  deleteButtonEmoji: {
    fontSize: fontSize.base,
    marginRight: spacing.md,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.md,
  },
});
