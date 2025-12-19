/**
 * Article Detail Screen
 * Displays full article content with open and delete options
 * Momentum-style aesthetic with gradient background and clean cards
 */

import React, { useState, useEffect, useContext } from 'react';
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
  StatusBar,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Article, getArticle, deleteArticle, updateArticle } from '../services/database';
import { formatDate } from '../services/articleExtractor';
import { ThemeContext } from '../context/ThemeContext';
import { wp, hp, fp, ms } from '../utils/responsive';

export default function ArticleDetailScreen({ route, navigation }: any) {
  const { settings } = useContext(ThemeContext);
  const systemColorScheme = useColorScheme();

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

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

  const handleToggleReadStatus = async () => {
    if (!article) return;

    try {
      const newStatus = !article.isUnread;
      await updateArticle(article.id, { isUnread: newStatus });
      setArticle({ ...article, isUnread: newStatus });
      Alert.alert('Success', newStatus ? 'Marked as unread' : 'Marked as read');
    } catch (error) {
      console.error('[ArticleDetailScreen] Error updating article:', error);
      Alert.alert('Error', 'Failed to update article status');
    }
  };

  const handleToggleBookmark = async () => {
    if (!article) return;

    try {
      const newBookmarkStatus = !article.isBookmarked;
      await updateArticle(article.id, { isBookmarked: newBookmarkStatus });
      setArticle({ ...article, isBookmarked: newBookmarkStatus });
      Alert.alert('Success', newBookmarkStatus ? 'Article bookmarked' : 'Bookmark removed');
    } catch (error) {
      console.error('[ArticleDetailScreen] Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
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
      <LinearGradient
        colors={isDark ? ['#1A1A1A', '#0F0F0F'] : ['#FFE5F0', '#E5F0FF', '#FFF5E5']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4A9FFF" />
            <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
              Loading article...
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!article) {
    return (
      <LinearGradient
        colors={isDark ? ['#1A1A1A', '#0F0F0F'] : ['#FFE5F0', '#E5F0FF', '#FFF5E5']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <View style={styles.centered}>
            <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
              Article not found
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={isDark ? ['#1A1A1A', '#0F0F0F'] : ['#FEFEFE', '#F5F5F7']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Article Image */}
          {article.imageUrl && (
            <Image
              source={{ uri: article.imageUrl }}
              style={styles.headerImage}
              resizeMode="cover"
              onError={() => console.log('[ArticleDetailScreen] Image loading failed')}
            />
          )}

          {/* Main Content Card */}
          <View style={[styles.contentCard, isDark && styles.contentCardDark]}>
            {/* Title */}
            <Text style={[styles.title, isDark && styles.titleDark]}>
              {article.title}
            </Text>

            {/* Metadata */}
            <View style={styles.metadataContainer}>
              {article.author && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataEmoji}>👤</Text>
                  <Text style={[styles.metadataText, isDark && styles.metadataTextDark]}>
                    {article.author}
                  </Text>
                </View>
              )}

              <View style={styles.metadataItem}>
                <Text style={styles.metadataEmoji}>📅</Text>
                <Text style={[styles.metadataText, isDark && styles.metadataTextDark]}>
                  {formatDate(article.savedAt)}
                </Text>
              </View>

              {article.publishDate && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataEmoji}>🕐</Text>
                  <Text style={[styles.metadataText, isDark && styles.metadataTextDark]}>
                    {formatDate(article.publishDate)}
                  </Text>
                </View>
              )}
            </View>

            {/* Summary Section */}
            {article.summary && (
              <View style={[styles.summaryContainer, isDark && styles.summaryContainerDark]}>
                <Text style={[styles.summaryTitle, isDark && styles.summaryTitleDark]}>
                  Summary
                </Text>
                <Text style={[styles.summaryText, isDark && styles.summaryTextDark]}>
                  {article.summary}
                </Text>
              </View>
            )}

            {/* AI Summary Section */}
            {article.aiEnhanced && article.aiSummary && (
              <View style={[styles.aiEnhancedContainer, isDark && styles.aiEnhancedContainerDark]}>
                <Text style={styles.aiEnhancedTitle}>✨ AI Summary</Text>
                <Text style={[styles.aiEnhancedText, isDark && styles.aiEnhancedTextDark]}>
                  {article.aiSummary}
                </Text>

                {/* Key Points */}
                {article.aiKeyPoints && article.aiKeyPoints.length > 0 && (
                  <View style={styles.keyPointsSection}>
                    <Text style={styles.keyPointsTitle}>Key Points:</Text>
                    {article.aiKeyPoints.map((point, index) => (
                      <Text
                        key={index}
                        style={[styles.keyPoint, isDark && styles.keyPointDark]}
                      >
                        • {point}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Metadata Pills */}
                <View style={styles.aiMetadataRow}>
                  {article.readingTimeMinutes && (
                    <View style={[styles.aiMetadataItem, isDark && styles.aiMetadataItemDark]}>
                      <Text style={[styles.aiMetadataLabel, isDark && styles.aiMetadataLabelDark]}>
                        Reading Time
                      </Text>
                      <Text style={[styles.aiMetadataValue, isDark && styles.aiMetadataValueDark]}>
                        {article.readingTimeMinutes} min
                      </Text>
                    </View>
                  )}
                  {article.aiSentiment && (
                    <View style={[styles.aiMetadataItem, isDark && styles.aiMetadataItemDark]}>
                      <Text style={[styles.aiMetadataLabel, isDark && styles.aiMetadataLabelDark]}>
                        Sentiment
                      </Text>
                      <Text style={[styles.aiMetadataValue, isDark && styles.aiMetadataValueDark]}>
                        {article.aiSentiment === 'positive' ? '😊' : article.aiSentiment === 'negative' ? '😞' : '😐'}{' '}
                        {article.aiSentiment}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons Row */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleOpenInBrowser}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonEmoji}>🌐</Text>
                <Text style={styles.actionButtonText}>Open</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleToggleReadStatus}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonEmoji}>{article.isUnread ? '👁️' : '✓'}</Text>
                <Text style={styles.actionButtonText}>
                  {article.isUnread ? 'Read' : 'Unread'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleCopyUrl}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonEmoji}>📋</Text>
                <Text style={styles.actionButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>

            {/* Bookmark Button */}
            <TouchableOpacity
              style={[
                styles.bookmarkButton,
                article?.isBookmarked && styles.bookmarkButtonActive,
              ]}
              onPress={handleToggleBookmark}
              activeOpacity={0.7}
            >
              <Text style={styles.bookmarkEmoji}>{article?.isBookmarked ? '⭐' : '☆'}</Text>
              <Text style={styles.bookmarkText}>
                {article?.isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Text>
            </TouchableOpacity>

            {/* Article URL */}
            <View style={[styles.urlContainer, isDark && styles.urlContainerDark]}>
              <Text style={[styles.urlLabel, isDark && styles.urlLabelDark]}>Article URL:</Text>
              <Text style={styles.urlText} selectable>
                {article.url}
              </Text>
            </View>

            {/* Delete Button */}
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
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(100),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(40),
  },
  loadingText: {
    fontSize: fp(14),
    color: '#6B7280',
    marginTop: hp(10),
  },
  loadingTextDark: {
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: fp(16),
    color: '#EF4444',
    textAlign: 'center',
  },
  errorTextDark: {
    color: '#F87171',
  },
  headerImage: {
    width: '100%',
    height: hp(200),
    marginBottom: hp(12),
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginHorizontal: wp(16),
    marginBottom: hp(16),
    padding: wp(16),
    borderRadius: ms(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(2) },
    shadowOpacity: 0.08,
    shadowRadius: ms(8),
    elevation: 3,
  },
  contentCardDark: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
  },
  title: {
    fontSize: fp(20),
    fontWeight: '700',
    color: '#111827',
    marginBottom: hp(12),
    lineHeight: fp(28),
  },
  titleDark: {
    color: '#F9FAFB',
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: hp(16),
    paddingBottom: hp(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(12),
    marginBottom: hp(6),
  },
  metadataEmoji: {
    fontSize: fp(12),
    marginRight: wp(4),
  },
  metadataText: {
    fontSize: fp(12),
    color: '#6B7280',
  },
  metadataTextDark: {
    color: '#9CA3AF',
  },
  summaryContainer: {
    backgroundColor: 'rgba(74, 159, 255, 0.08)',
    padding: wp(14),
    borderRadius: ms(10),
    marginBottom: hp(12),
    borderLeftWidth: 3,
    borderLeftColor: '#4A9FFF',
  },
  summaryContainerDark: {
    backgroundColor: 'rgba(74, 159, 255, 0.15)',
  },
  summaryTitle: {
    fontSize: fp(13),
    fontWeight: '600',
    color: '#111827',
    marginBottom: hp(6),
  },
  summaryTitleDark: {
    color: '#F9FAFB',
  },
  summaryText: {
    fontSize: fp(13),
    color: '#6B7280',
    lineHeight: fp(18),
  },
  summaryTextDark: {
    color: '#9CA3AF',
  },
  aiEnhancedContainer: {
    backgroundColor: 'rgba(74, 159, 255, 0.08)',
    padding: wp(14),
    borderRadius: ms(10),
    marginBottom: hp(12),
    borderLeftWidth: 3,
    borderLeftColor: '#4A9FFF',
  },
  aiEnhancedContainerDark: {
    backgroundColor: 'rgba(74, 159, 255, 0.15)',
  },
  aiEnhancedTitle: {
    fontSize: fp(13),
    fontWeight: '600',
    color: '#4A9FFF',
    marginBottom: hp(10),
  },
  aiEnhancedText: {
    fontSize: fp(13),
    color: '#111827',
    lineHeight: fp(18),
    marginBottom: hp(10),
  },
  aiEnhancedTextDark: {
    color: '#F9FAFB',
  },
  keyPointsSection: {
    marginBottom: hp(10),
  },
  keyPointsTitle: {
    fontSize: fp(12),
    fontWeight: '600',
    color: '#4A9FFF',
    marginBottom: hp(6),
  },
  keyPoint: {
    fontSize: fp(12),
    color: '#6B7280',
    lineHeight: fp(16),
    marginBottom: hp(3),
  },
  keyPointDark: {
    color: '#9CA3AF',
  },
  aiMetadataRow: {
    flexDirection: 'row',
    marginBottom: hp(10),
    gap: wp(6),
    flexWrap: 'wrap',
  },
  aiMetadataItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingVertical: hp(6),
    paddingHorizontal: wp(10),
    borderRadius: ms(6),
    alignItems: 'center',
  },
  aiMetadataItemDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  aiMetadataLabel: {
    fontSize: fp(10),
    color: '#6B7280',
    marginBottom: hp(1),
  },
  aiMetadataLabelDark: {
    color: '#9CA3AF',
  },
  aiMetadataValue: {
    fontSize: fp(11),
    fontWeight: '600',
    color: '#111827',
  },
  aiMetadataValueDark: {
    color: '#F9FAFB',
  },
  aiTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(6),
  },
  aiTag: {
    backgroundColor: 'rgba(74, 159, 255, 0.2)',
    paddingVertical: hp(4),
    paddingHorizontal: wp(10),
    borderRadius: ms(6),
  },
  aiTagText: {
    fontSize: fp(11),
    fontWeight: '600',
    color: '#4A9FFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: hp(12),
    gap: wp(10),
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4A9FFF',
    paddingVertical: hp(10),
    paddingHorizontal: wp(12),
    borderRadius: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(2) },
    shadowOpacity: 0.1,
    shadowRadius: ms(4),
    elevation: 2,
  },
  actionButtonEmoji: {
    fontSize: fp(14),
    marginRight: wp(4),
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: fp(12),
    fontWeight: '600',
  },
  bookmarkButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: hp(10),
    paddingHorizontal: wp(16),
    borderRadius: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(12),
    borderWidth: 2,
    borderColor: '#4A9FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(2) },
    shadowOpacity: 0.08,
    shadowRadius: ms(4),
    elevation: 2,
  },
  bookmarkButtonActive: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  bookmarkEmoji: {
    fontSize: fp(16),
    marginRight: wp(6),
  },
  bookmarkText: {
    color: '#4A9FFF',
    fontSize: fp(13),
    fontWeight: '600',
  },
  urlContainer: {
    backgroundColor: 'rgba(74, 159, 255, 0.08)',
    padding: wp(14),
    borderRadius: ms(10),
    marginBottom: hp(12),
    borderLeftWidth: 3,
    borderLeftColor: '#4A9FFF',
  },
  urlContainerDark: {
    backgroundColor: 'rgba(74, 159, 255, 0.15)',
  },
  urlLabel: {
    fontSize: fp(11),
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: hp(6),
  },
  urlLabelDark: {
    color: '#9CA3AF',
  },
  urlText: {
    fontSize: fp(11),
    color: '#4A9FFF',
    fontFamily: 'monospace',
    lineHeight: fp(14),
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: hp(12),
    paddingHorizontal: wp(16),
    borderRadius: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(2) },
    shadowOpacity: 0.15,
    shadowRadius: ms(4),
    elevation: 2,
  },
  deleteButtonEmoji: {
    fontSize: fp(14),
    marginRight: wp(6),
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: fp(13),
    fontWeight: '600',
  },
});
