/**
 * SearchModal - Modal for searching articles
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { wp, hp, fp, ms } from '../utils/responsive';
import { Article, updateArticle, deleteArticle } from '../services/database';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  articles: Article[];
  onArticleSelect: (article: Article) => void;
  onArticleDeleted?: () => void;
  onArticleTagged?: () => void;
  isDarkMode: boolean;
  colors: any;
}

type ReadFilter = 'all' | 'read' | 'unread';

export default function SearchModal({
  visible,
  onClose,
  articles,
  onArticleSelect,
  onArticleDeleted,
  onArticleTagged,
  isDarkMode,
  colors,
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [customTag, setCustomTag] = useState('');

  useEffect(() => {
    let filtered = articles;

    // Apply read/unread filter
    if (readFilter === 'read') {
      filtered = filtered.filter(article => article.isUnread === false);
    } else if (readFilter === 'unread') {
      filtered = filtered.filter(article => article.isUnread !== false);
    }

    // Apply search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title?.toLowerCase().includes(query) ||
          article.summary?.toLowerCase().includes(query) ||
          article.url?.toLowerCase().includes(query) ||
          article.platform?.toLowerCase().includes(query)
      );
    }

    setFilteredArticles(filtered);
  }, [searchQuery, articles, readFilter]);

  const handleClose = () => {
    setSearchQuery('');
    setReadFilter('all');
    setShowActionMenu(false);
    setShowTagInput(false);
    setSelectedArticle(null);
    setCustomTag('');
    onClose();
  };

  // Open article URL directly
  const handleOpenUrl = async (article: Article) => {
    try {
      // Mark as read
      if (article.isUnread !== false) {
        await updateArticle(article.id, { isUnread: false });
      }
      if (article.url) {
        await Linking.openURL(article.url);
      }
    } catch (error) {
      console.error('[SearchModal] Error opening URL:', error);
    }
  };

  // Long press to show action menu
  const handleLongPress = (article: Article) => {
    setSelectedArticle(article);
    setShowActionMenu(true);
  };

  // Delete article
  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;

    Alert.alert(
      'Delete Article',
      'Are you sure you want to delete this article?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteArticle(selectedArticle.id);
            setShowActionMenu(false);
            setSelectedArticle(null);
            onArticleDeleted?.();
          },
        },
      ]
    );
  };

  // Add tag to article
  const handleAddTag = async () => {
    if (!selectedArticle || !customTag.trim()) return;

    const currentTags = selectedArticle.tags || [];
    const newTags = [...new Set([...currentTags, customTag.trim()])];
    await updateArticle(selectedArticle.id, { tags: newTags });

    setCustomTag('');
    setShowTagInput(false);
    setShowActionMenu(false);
    setSelectedArticle(null);
    onArticleTagged?.();
  };

  const getTimeSince = (date: string) => {
    const savedDate = new Date(date);
    const now = new Date();
    const diff = now.getTime() - savedDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h ago`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m ago`;
  };

  const renderArticle = ({ item }: { item: Article }) => {
    const isUnread = item.isUnread !== false;
    return (
      <TouchableOpacity
        style={[styles.articleItem, { backgroundColor: colors.background.tertiary }]}
        onPress={() => handleOpenUrl(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        {/* Unread indicator dot */}
        {isUnread && (
          <View style={styles.unreadDot} />
        )}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.articleImage} />
        ) : (
          <View style={[styles.articleImagePlaceholder, { backgroundColor: colors.accent.bg }]}>
            <Icon name="globe-outline" size={24} color={colors.accent.primary} />
          </View>
        )}
        <View style={styles.articleContent}>
          <Text
            style={[
              styles.articleTitle,
              { color: colors.text.primary },
              !isUnread && styles.articleTitleRead,
            ]}
            numberOfLines={2}
          >
            {item.title || 'Untitled'}
          </Text>
          <View style={styles.articleMeta}>
            <Text style={[styles.articlePlatform, { color: colors.text.tertiary }]}>
              {item.platform || 'Web'}
            </Text>
            <Text style={[styles.articleTime, { color: colors.text.tertiary }]}>
              {getTimeSince(item.savedAt)}
            </Text>
            {!isUnread && (
              <View style={styles.readBadge}>
                <Icon name="checkmark-circle" size={12} color="#10B981" />
                <Text style={styles.readBadgeText}>Read</Text>
              </View>
            )}
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: colors.background.primary },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Search
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <Icon name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder="Search articles..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: readFilter === 'all' ? colors.accent.primary : colors.background.secondary },
              ]}
              onPress={() => setReadFilter('all')}
            >
              <Icon
                name="albums-outline"
                size={16}
                color={readFilter === 'all' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text style={[
                styles.filterButtonText,
                { color: readFilter === 'all' ? '#FFFFFF' : colors.text.secondary },
              ]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: readFilter === 'unread' ? colors.accent.primary : colors.background.secondary },
              ]}
              onPress={() => setReadFilter('unread')}
            >
              <Icon
                name="eye-off-outline"
                size={16}
                color={readFilter === 'unread' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text style={[
                styles.filterButtonText,
                { color: readFilter === 'unread' ? '#FFFFFF' : colors.text.secondary },
              ]}>
                Unread
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: readFilter === 'read' ? colors.accent.primary : colors.background.secondary },
              ]}
              onPress={() => setReadFilter('read')}
            >
              <Icon
                name="eye-outline"
                size={16}
                color={readFilter === 'read' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text style={[
                styles.filterButtonText,
                { color: readFilter === 'read' ? '#FFFFFF' : colors.text.secondary },
              ]}>
                Read
              </Text>
            </TouchableOpacity>
          </View>

          {/* Results */}
          <FlatList
            data={filteredArticles}
            renderItem={renderArticle}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="search-outline" size={48} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                  {searchQuery ? 'No articles found' : 'Start typing to search'}
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowActionMenu(false);
            setShowTagInput(false);
            setSelectedArticle(null);
          }}
        >
          <View style={[styles.actionMenuContainer, { backgroundColor: colors.background.primary }]}>
            <Text style={[styles.actionMenuTitle, { color: colors.text.primary }]} numberOfLines={2}>
              {selectedArticle?.title || 'Article'}
            </Text>

            {showTagInput ? (
              <View style={styles.tagInputContainer}>
                <TextInput
                  style={[styles.tagInput, { backgroundColor: colors.background.secondary, color: colors.text.primary }]}
                  placeholder="Enter tag name..."
                  placeholderTextColor={colors.text.tertiary}
                  value={customTag}
                  onChangeText={setCustomTag}
                  autoFocus
                />
                <View style={styles.tagInputButtons}>
                  <TouchableOpacity
                    style={[styles.tagInputButton, { backgroundColor: colors.background.secondary }]}
                    onPress={() => setShowTagInput(false)}
                  >
                    <Text style={{ color: colors.text.secondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tagInputButton, { backgroundColor: colors.accent.primary }]}
                    onPress={handleAddTag}
                  >
                    <Text style={{ color: '#FFFFFF' }}>Add Tag</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionMenuItem, { backgroundColor: colors.background.secondary }]}
                  onPress={() => setShowTagInput(true)}
                >
                  <Icon name="pricetag-outline" size={20} color={colors.accent.primary} />
                  <Text style={[styles.actionMenuItemText, { color: colors.text.primary }]}>
                    Add to Custom Stack
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionMenuItem, { backgroundColor: colors.background.secondary }]}
                  onPress={handleDeleteArticle}
                >
                  <Icon name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.actionMenuItemText, { color: '#EF4444' }]}>
                    Delete Article
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionMenuCancel, { backgroundColor: colors.background.secondary }]}
                  onPress={() => {
                    setShowActionMenu(false);
                    setSelectedArticle(null);
                  }}
                >
                  <Text style={[styles.actionMenuCancelText, { color: colors.text.secondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: hp(60),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(20),
    marginBottom: hp(16),
  },
  title: {
    fontSize: fp(24),
    fontWeight: '700',
  },
  closeButton: {
    padding: wp(4),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(20),
    paddingHorizontal: wp(16),
    paddingVertical: hp(12),
    borderRadius: ms(14),
    gap: wp(10),
  },
  searchInput: {
    flex: 1,
    fontSize: fp(16),
    padding: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(20),
    paddingVertical: hp(12),
    gap: wp(10),
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(14),
    paddingVertical: hp(8),
    borderRadius: ms(20),
    gap: wp(6),
  },
  filterButtonText: {
    fontSize: fp(13),
    fontWeight: '600',
  },
  listContent: {
    padding: wp(20),
    paddingTop: hp(16),
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(12),
    borderRadius: ms(14),
    marginBottom: hp(10),
  },
  articleImage: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(10),
  },
  articleImagePlaceholder: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContent: {
    flex: 1,
    marginLeft: wp(12),
    marginRight: wp(8),
  },
  articleTitle: {
    fontSize: fp(14),
    fontWeight: '600',
    marginBottom: hp(4),
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
  },
  articlePlatform: {
    fontSize: fp(12),
    textTransform: 'capitalize',
  },
  articleTime: {
    fontSize: fp(12),
  },
  articleTitleRead: {
    opacity: 0.7,
  },
  unreadDot: {
    position: 'absolute',
    top: wp(12),
    left: wp(4),
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: '#3B82F6',
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    marginLeft: wp(4),
  },
  readBadgeText: {
    fontSize: fp(11),
    color: '#10B981',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: hp(60),
  },
  emptyText: {
    fontSize: fp(16),
    marginTop: hp(16),
  },
  // Action Menu Styles
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(20),
  },
  actionMenuContainer: {
    width: '100%',
    maxWidth: wp(320),
    borderRadius: ms(16),
    padding: wp(20),
  },
  actionMenuTitle: {
    fontSize: fp(16),
    fontWeight: '600',
    marginBottom: hp(16),
    textAlign: 'center',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(14),
    borderRadius: ms(12),
    marginBottom: hp(10),
    gap: wp(12),
  },
  actionMenuItemText: {
    fontSize: fp(15),
    fontWeight: '500',
  },
  actionMenuCancel: {
    alignItems: 'center',
    padding: wp(14),
    borderRadius: ms(12),
    marginTop: hp(6),
  },
  actionMenuCancelText: {
    fontSize: fp(15),
    fontWeight: '500',
  },
  tagInputContainer: {
    marginTop: hp(8),
  },
  tagInput: {
    padding: wp(14),
    borderRadius: ms(12),
    fontSize: fp(15),
    marginBottom: hp(12),
  },
  tagInputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(10),
  },
  tagInputButton: {
    flex: 1,
    alignItems: 'center',
    padding: wp(12),
    borderRadius: ms(12),
  },
});
