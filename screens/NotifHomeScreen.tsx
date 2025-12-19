/**
 * NotiF-style Home Screen
 * Main swipe interface with Stacks, Grid, and Custom views
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
  useColorScheme,
  Linking,
  TextInput,
  Alert,
  Modal,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import {
  Article,
  Folder,
  getAllArticles,
  deleteArticle,
  updateArticle,
  getBookmarkedArticles,
  getAllFolders,
  getArticlesByFolder,
  deleteFolder,
} from '../services/database';
import NotifSwipeCard from '../components/NotifSwipeCard';
import AddLinkModal from '../components/AddLinkModal';
import SearchModal from '../components/SearchModal';
import { wp, hp, fp, ms, screenWidth } from '../utils/responsive';
import { isVideoPlatform, getPlatformConfig, PlatformType } from '../styles/platformColors';

type ViewMode = 'stacks' | 'grid' | 'custom';
type ReadFilter = 'all' | 'read' | 'unread';

export default function NotifHomeScreen({ navigation }: any) {
  const { settings, getThemedColors } = useTheme();
  const systemColorScheme = useColorScheme();

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  const colors = getThemedColors(isDark);

  const [articles, setArticles] = useState<Article[]>([]); // All articles for stack view
  const [allArticles, setAllArticles] = useState<Article[]>([]); // All articles for grid view and search
  const [priorityArticles, setPriorityArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardResetKey, setCardResetKey] = useState(0); // Used to force card remount on single card skip
  const [selectedView, setSelectedView] = useState<ViewMode>('stacks');
  const [loading, setLoading] = useState(true);
  const [swipeHistory, setSwipeHistory] = useState<number[]>([]);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([]);
  const [showBookmarksFolder, setShowBookmarksFolder] = useState(false);

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [folderArticles, setFolderArticles] = useState<Article[]>([]);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [folderViewMode, setFolderViewMode] = useState<'stack' | 'grid'>('stack');
  const [folderArticleIndex, setFolderArticleIndex] = useState(0);
  const [folderCardResetKey, setFolderCardResetKey] = useState(0);

  // Grid view search state
  const [gridSearchQuery, setGridSearchQuery] = useState('');
  const [gridReadFilter, setGridReadFilter] = useState<ReadFilter>('all');
  const [selectedGridArticle, setSelectedGridArticle] = useState<Article | null>(null);
  const [showGridActionMenu, setShowGridActionMenu] = useState(false);
  const [showGridTagInput, setShowGridTagInput] = useState(false);
  const [gridCustomTag, setGridCustomTag] = useState('');

  const loadArticles = useCallback(async () => {
    try {
      const fetchedArticles = await getAllArticles();

      // Apply platform filter from settings
      const platformFilter = settings.platformFilter;
      let filteredByPlatform = fetchedArticles;

      if (platformFilter && platformFilter !== 'all') {
        // Handle multiple platforms (comma-separated)
        const platforms = platformFilter.split(',').map(p => p.trim().toLowerCase());
        filteredByPlatform = fetchedArticles.filter(a => {
          const articlePlatform = (a.platform || 'web').toLowerCase();
          return platforms.includes(articlePlatform);
        });
      }

      // Apply sorting based on settings
      const sortBy = settings.sortBy || 'date';
      const sortArticles = (articlesToSort: typeof filteredByPlatform) => {
        return [...articlesToSort].sort((a, b) => {
          if (sortBy === 'date') {
            // New Arrivals - newest first
            return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
          } else {
            // Vintage - oldest first
            return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
          }
        });
      };

      // All articles for grid view and search (exclude priority/bookmarked)
      const nonPriority = sortArticles(filteredByPlatform.filter(a => !a.isBookmarked));
      setAllArticles(nonPriority);
      // Stack view shows all non-priority articles (no read/unread filtering)
      const priority = sortArticles(filteredByPlatform.filter(a => a.isBookmarked));
      setArticles(nonPriority);
      setPriorityArticles(priority);
      setCurrentIndex(0);

      // Load bookmarked articles for Bookmarks folder
      const bookmarked = await getBookmarkedArticles();
      setBookmarkedArticles(bookmarked);

      // Load folders
      const allFolders = await getAllFolders();
      setFolders(allFolders);
    } catch (error) {
      console.error('[NotifHomeScreen] Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  }, [settings.platformFilter, settings.sortBy]);

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles])
  );

  // Listen for refresh event from share intent
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refreshArticles', () => {
      console.log('[NotifHomeScreen] Received refresh event');
      loadArticles();
    });

    return () => subscription.remove();
  }, [loadArticles]);

  // Get visible cards for stack (3 cards)
  const getVisibleCards = () => {
    if (articles.length === 0) return [];
    const visible = [];
    for (let i = 0; i < Math.min(3, articles.length); i++) {
      const index = (currentIndex + i) % articles.length;
      visible.push(articles[index]);
    }
    return visible;
  };

  const visibleCards = getVisibleCards();

  const handleSwipeLeft = async (articleId: number) => {
    // Skip - cycle to bottom of stack
    setSwipeHistory(prev => [...prev, articleId]);

    // If only 1 card, force re-render by incrementing reset key
    if (articles.length === 1) {
      setCardResetKey(prev => prev + 1);
    } else {
      setCurrentIndex(prev => (prev + 1) % articles.length);
    }
  };

  const handleSwipeRight = async (articleId: number) => {
    try {
      // Mark as priority (bookmarked)
      await updateArticle(articleId, { isBookmarked: true });

      // Remove from unprocessed list
      const updated = articles.filter(a => a.id !== articleId);
      setArticles(updated);

      // Add to priority list
      const article = articles.find(a => a.id === articleId);
      if (article) {
        setPriorityArticles(prev => [...prev, { ...article, isBookmarked: true }]);
      }

      // Adjust index if needed
      if (updated.length > 0 && currentIndex >= updated.length) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('[NotifHomeScreen] Error marking as priority:', error);
    }
  };

  const handleDelete = async (articleId: number) => {
    try {
      await deleteArticle(articleId);
      // Remove from all article states to sync across views
      const updated = articles.filter(a => a.id !== articleId);
      setArticles(updated);
      setAllArticles(prev => prev.filter(a => a.id !== articleId));
      setPriorityArticles(prev => prev.filter(a => a.id !== articleId));
      if (updated.length > 0 && currentIndex >= updated.length) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('[NotifHomeScreen] Error deleting article:', error);
    }
  };

  const handleUndo = () => {
    if (swipeHistory.length === 0) return;
    const lastId = swipeHistory[swipeHistory.length - 1];
    setSwipeHistory(prev => prev.slice(0, -1));
    const lastIndex = articles.findIndex(a => a.id === lastId);
    if (lastIndex !== -1) {
      setCurrentIndex(lastIndex);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...articles].sort(() => Math.random() - 0.5);
    setArticles(shuffled);
    setCurrentIndex(0);
  };

  const handleViewArticle = async (article: Article) => {
    // Mark as read when viewing
    await updateArticle(article.id, { isUnread: false });
    // Update read status in both article states
    setArticles(prev => prev.map(a =>
      a.id === article.id ? { ...a, isUnread: false } : a
    ));
    setAllArticles(prev => prev.map(a =>
      a.id === article.id ? { ...a, isUnread: false } : a
    ));

    // Move to next card in stack
    if (articles.length > 1) {
      setCurrentIndex(prev => (prev + 1) % articles.length);
    }

    navigation.navigate('ArticleDetail', { id: article.id });
  };

  // Open article URL directly in browser and mark as read
  const openArticleUrl = async (article: Article) => {
    try {
      // Mark as read when opening URL
      await updateArticle(article.id, { isUnread: false });
      // Update read status in both article states
      setArticles(prev => prev.map(a =>
        a.id === article.id ? { ...a, isUnread: false } : a
      ));
      setAllArticles(prev => prev.map(a =>
        a.id === article.id ? { ...a, isUnread: false } : a
      ));

      // Move to next card in stack
      if (articles.length > 1) {
        setCurrentIndex(prev => (prev + 1) % articles.length);
      }

      if (article.url) {
        await Linking.openURL(article.url);
      }
    } catch (error) {
      console.error('[NotifHomeScreen] Error opening URL:', error);
    }
  };

  // Toggle bookmark status for an article
  const handleToggleBookmark = async (article: Article) => {
    try {
      const newBookmarkStatus = !article.isBookmarked;
      await updateArticle(article.id, { isBookmarked: newBookmarkStatus });
      // Refresh bookmarked articles
      const bookmarked = await getBookmarkedArticles();
      setBookmarkedArticles(bookmarked);
      // Update the article in both article lists
      setArticles(prev => prev.map(a =>
        a.id === article.id ? { ...a, isBookmarked: newBookmarkStatus } : a
      ));
      setAllArticles(prev => prev.map(a =>
        a.id === article.id ? { ...a, isBookmarked: newBookmarkStatus } : a
      ));
    } catch (error) {
      console.error('[NotifHomeScreen] Error toggling bookmark:', error);
    }
  };

  // Open Bookmarks folder
  const handleOpenBookmarksFolder = async () => {
    const bookmarked = await getBookmarkedArticles();
    setBookmarkedArticles(bookmarked);
    setShowBookmarksFolder(true);
  };

  // Close Bookmarks folder
  const handleCloseBookmarksFolder = () => {
    setShowBookmarksFolder(false);
  };

  // Open a folder
  const handleOpenFolder = async (folder: Folder) => {
    const articles = await getArticlesByFolder(folder.id);
    setFolderArticles(articles);
    setFolderArticleIndex(0);
    setSelectedFolder(folder);
  };

  // Handle folder card swipe left (skip to next)
  const handleFolderSwipeLeft = (articleId: number) => {
    // If only one card, force re-render with reset key
    if (folderArticles.length === 1) {
      setFolderCardResetKey(prev => prev + 1);
    } else if (folderArticleIndex >= folderArticles.length - 1) {
      // At the end, reset to start
      setFolderArticleIndex(0);
    } else {
      setFolderArticleIndex(prev => prev + 1);
    }
  };

  // Handle folder card swipe right (open article)
  const handleFolderSwipeRight = (articleId: number) => {
    const article = folderArticles.find(a => a.id === articleId || a.id === String(articleId));
    if (article) {
      openArticleUrl(article);
    }
    // If only one card, force re-render with reset key
    if (folderArticles.length === 1) {
      setFolderCardResetKey(prev => prev + 1);
    } else if (folderArticleIndex >= folderArticles.length - 1) {
      // At the end, reset to start
      setFolderArticleIndex(0);
    } else {
      setFolderArticleIndex(prev => prev + 1);
    }
  };

  // Close folder view
  const handleCloseFolder = () => {
    setSelectedFolder(null);
    setFolderArticles([]);
    setFolderViewMode('stack');
  };

  // Delete folder
  const handleDeleteFolder = async (folder: Folder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? Articles will be moved back to the main feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFolder(folder.id);
            setFolders(prev => prev.filter(f => f.id !== folder.id));
            if (selectedFolder?.id === folder.id) {
              handleCloseFolder();
            }
            loadArticles();
          },
        },
      ]
    );
  };

  // Get filtered folders based on search
  const getFilteredFolders = () => {
    if (!folderSearchQuery.trim()) return folders;
    const query = folderSearchQuery.toLowerCase();
    return folders.filter(f => f.name.toLowerCase().includes(query));
  };

  const filteredFolders = getFilteredFolders();

  const handleTagsSaved = async () => {
    // Refresh articles after saving tags
    console.log('[NotifHomeScreen] Tags saved, refreshing...');
    loadArticles();
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

  // Filtered articles for grid view
  const getFilteredGridArticles = () => {
    // Combine and deduplicate by ID
    const allCombined = [...allArticles, ...priorityArticles];
    const seen = new Set<string | number>();
    let filtered = allCombined.filter(article => {
      const idKey = String(article.id);
      if (seen.has(idKey)) return false;
      seen.add(idKey);
      return true;
    });

    // Apply read/unread filter
    if (gridReadFilter === 'read') {
      filtered = filtered.filter(article => article.isUnread === false);
    } else if (gridReadFilter === 'unread') {
      filtered = filtered.filter(article => article.isUnread !== false);
    }

    // Apply search query filter
    if (gridSearchQuery.trim() !== '') {
      const query = gridSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title?.toLowerCase().includes(query) ||
          article.summary?.toLowerCase().includes(query) ||
          article.url?.toLowerCase().includes(query) ||
          article.platform?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredGridArticles = getFilteredGridArticles();

  // Grid view long press handler
  const handleGridLongPress = (article: Article) => {
    setSelectedGridArticle(article);
    setShowGridActionMenu(true);
  };

  // Grid view delete article
  const handleGridDeleteArticle = async () => {
    if (!selectedGridArticle) return;

    Alert.alert(
      'Delete Article',
      'Are you sure you want to delete this article?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteArticle(selectedGridArticle.id);
            setShowGridActionMenu(false);
            setSelectedGridArticle(null);
            loadArticles();
          },
        },
      ]
    );
  };

  // Grid view add tag
  const handleGridAddTag = async () => {
    if (!selectedGridArticle || !gridCustomTag.trim()) return;

    const tagToAdd = gridCustomTag.trim();
    const currentTags = selectedGridArticle.tags || [];

    // Check if tag already exists (case-insensitive)
    const tagExists = currentTags.some(t => t.toLowerCase() === tagToAdd.toLowerCase());
    if (tagExists) {
      Alert.alert('Duplicate Tag', 'This article already has this tag.');
      return;
    }

    const newTags = [...currentTags, tagToAdd];
    await updateArticle(selectedGridArticle.id, { tags: newTags });

    setGridCustomTag('');
    setShowGridTagInput(false);
    setShowGridActionMenu(false);
    setSelectedGridArticle(null);
    loadArticles();
  };

  // Grid view add existing tag (from predefined list)
  const handleGridAddExistingTag = async (tagName: string) => {
    if (!selectedGridArticle) return;

    const currentTags = selectedGridArticle.tags || [];

    // Check if tag already exists (case-insensitive)
    const tagExists = currentTags.some(t => t.toLowerCase() === tagName.toLowerCase());
    if (tagExists) {
      Alert.alert('Duplicate Tag', 'This article already has this tag.');
      return;
    }

    const newTags = [...currentTags, tagName];
    await updateArticle(selectedGridArticle.id, { tags: newTags });

    setShowGridActionMenu(false);
    setSelectedGridArticle(null);
    loadArticles();
  };

  // Grid view toggle read/unread status
  const handleGridToggleReadStatus = async () => {
    if (!selectedGridArticle) return;

    const newReadStatus = selectedGridArticle.isUnread === false ? true : false;
    await updateArticle(selectedGridArticle.id, { isUnread: newReadStatus });

    setShowGridActionMenu(false);
    setSelectedGridArticle(null);
    loadArticles();
  };

  // Get all unique tags from all articles for predefined tag list
  const getAllExistingTags = (): string[] => {
    const allTags = new Set<string>();
    [...allArticles, ...priorityArticles].forEach(article => {
      article.tags?.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  };

  const existingTags = getAllExistingTags();

  // Bottom navigation - switches view modes (Grid, Stacks, Custom)
  const renderViewModeSelector = () => (
    <View style={styles.navBarContainer}>
      <TouchableOpacity
        style={[
          styles.navBarButton,
          { backgroundColor: selectedView === 'grid' ? colors.accent.primary : colors.background.secondary },
        ]}
        onPress={() => setSelectedView('grid')}
      >
        <Icon name="grid" size={ms(18)} color={selectedView === 'grid' ? '#FFFFFF' : colors.accent.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.navBarButton,
          { backgroundColor: selectedView === 'stacks' ? colors.accent.primary : colors.background.secondary },
        ]}
        onPress={() => setSelectedView('stacks')}
      >
        <Icon name="layers" size={ms(18)} color={selectedView === 'stacks' ? '#FFFFFF' : colors.accent.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.navBarButton,
          { backgroundColor: selectedView === 'custom' ? colors.accent.primary : colors.background.secondary },
        ]}
        onPress={() => setSelectedView('custom')}
      >
        <Icon name="create" size={ms(18)} color={selectedView === 'custom' ? '#FFFFFF' : colors.accent.primary} />
      </TouchableOpacity>
    </View>
  );

  // Check if stack is empty (no unread articles) - used for showing empty state in stacks view only
  const isStackEmpty = !loading && articles.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header with circular icon buttons */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Add Link Button */}
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => setShowAddLinkModal(true)}
          >
            <Icon name="add-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Shuffle Button */}
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.accent.primary }]}
            onPress={handleShuffle}
          >
            <Icon name="shuffle" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Undo Button */}
          <TouchableOpacity
            style={[
              styles.headerButton,
              {
                backgroundColor: swipeHistory.length > 0 ? colors.accent.primary : colors.accent.light,
                opacity: swipeHistory.length > 0 ? 1 : 0.5,
              },
            ]}
            onPress={handleUndo}
            disabled={swipeHistory.length === 0}
          >
            <Icon name="arrow-undo" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {/* Priority Badge */}
          <TouchableOpacity
            style={[styles.priorityBadge, { backgroundColor: colors.accent.primary }]}
            onPress={() => navigation.navigate('PriorityReview')}
          >
            <Icon name="heart" size={18} color="#FFFFFF" />
            <Text style={styles.priorityCount}>{priorityArticles.length}</Text>
          </TouchableOpacity>

          {/* Settings Button */}
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.accent.bg }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings-sharp" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content based on view mode */}
      {selectedView === 'stacks' ? (
        isStackEmpty ? (
          // Empty state for stacks view - no unread articles
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
              <Icon name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              All Caught Up!
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              No unread articles in your stack.{'\n'}Switch to Grid view to see read articles.
            </Text>

            <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={[styles.folderButton, { backgroundColor: '#22C55E' }]}
                onPress={() => navigation.navigate('PriorityReview')}
              >
                <Icon name="heart" size={28} color="#FFFFFF" />
                <View style={styles.folderInfo}>
                  <Text style={styles.folderLabel}>Priority</Text>
                  <Text style={styles.folderCount}>{priorityArticles.length}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.stacksContainer}>
            {/* App title - NotiF style */}
            <View style={styles.titleContainer}>
              <Text style={[styles.appTitle, { color: colors.accent.primary }]}>NotiF</Text>
              <Text style={[styles.appSubtitle, { color: colors.text.primary }]}>
                BOOKMARK
              </Text>
            </View>

            {/* Cards stack */}
            <View style={styles.cardsContainer}>
              {visibleCards.map((article, index) => (
                <NotifSwipeCard
                  key={`${article.id}-${cardResetKey}`}
                  article={article}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onDelete={handleDelete}
                  onView={handleViewArticle}
                  onTagsSaved={handleTagsSaved}
                  isTopCard={index === 0}
                  colors={colors}
                  isDarkMode={isDark}
                  stackIndex={index}
                />
              ))}
            </View>

            {/* Swipe Instructions */}
            <LinearGradient
              colors={isDark ? [colors.background.tertiary, colors.background.secondary] : [colors.background.secondary, colors.background.tertiary]}
              style={styles.instructionsBox}
            >
              <View style={styles.instructionRow}>
                <View style={[styles.instructionIconBox, { backgroundColor: colors.background.border }]}>
                  <Icon name="arrow-back" size={16} color={isDark ? '#FFFFFF' : colors.text.primary} />
                </View>
                <View style={[styles.instructionEmojiBox, { backgroundColor: colors.accent.bg }]}>
                  <Icon name="hand-left-outline" size={16} color={colors.accent.primary} />
                </View>
                <Text style={[styles.instructionText, { color: colors.text.secondary }]}>
                  Swipe left to <Text style={[styles.instructionBold, { color: colors.text.primary }]}>Skip</Text>
                </Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={[styles.instructionIconBox, { backgroundColor: colors.accent.primary }]}>
                  <Icon name="arrow-forward" size={16} color="#FFFFFF" />
                </View>
                <View style={[styles.instructionEmojiBox, { backgroundColor: colors.accent.bg }]}>
                  <Icon name="heart" size={16} color={colors.accent.primary} />
                </View>
                <Text style={[styles.instructionText, { color: colors.text.secondary }]}>
                  Swipe right for <Text style={[styles.instructionBold, { color: colors.accent.primary }]}>Priority</Text>
                </Text>
              </View>
            </LinearGradient>
          </View>
        )
      ) : selectedView === 'grid' ? (
        <View style={styles.gridSearchContainer}>
          {/* Search Input */}
          <View
            style={[
              styles.gridSearchBar,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <Icon name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={[styles.gridSearchInput, { color: colors.text.primary }]}
              placeholder="Search articles..."
              placeholderTextColor={colors.text.tertiary}
              value={gridSearchQuery}
              onChangeText={setGridSearchQuery}
            />
            {gridSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setGridSearchQuery('')}>
                <Icon name="close-circle" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Buttons */}
          <View style={styles.gridFilterContainer}>
            <TouchableOpacity
              style={[
                styles.gridFilterButton,
                { backgroundColor: gridReadFilter === 'all' ? colors.accent.primary : colors.background.secondary },
              ]}
              onPress={() => setGridReadFilter('all')}
            >
              <Icon
                name="albums-outline"
                size={16}
                color={gridReadFilter === 'all' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text style={[
                styles.gridFilterButtonText,
                { color: gridReadFilter === 'all' ? '#FFFFFF' : colors.text.secondary },
              ]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.gridFilterButton,
                { backgroundColor: gridReadFilter === 'unread' ? colors.accent.primary : colors.background.secondary },
              ]}
              onPress={() => setGridReadFilter('unread')}
            >
              <Icon
                name="eye-off-outline"
                size={16}
                color={gridReadFilter === 'unread' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text style={[
                styles.gridFilterButtonText,
                { color: gridReadFilter === 'unread' ? '#FFFFFF' : colors.text.secondary },
              ]}>
                Unread
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.gridFilterButton,
                { backgroundColor: gridReadFilter === 'read' ? colors.accent.primary : colors.background.secondary },
              ]}
              onPress={() => setGridReadFilter('read')}
            >
              <Icon
                name="eye-outline"
                size={16}
                color={gridReadFilter === 'read' ? '#FFFFFF' : colors.text.secondary}
              />
              <Text style={[
                styles.gridFilterButtonText,
                { color: gridReadFilter === 'read' ? '#FFFFFF' : colors.text.secondary },
              ]}>
                Read
              </Text>
            </TouchableOpacity>
          </View>

          {/* Article List */}
          <FlatList
            data={filteredGridArticles}
            renderItem={({ item }) => {
              const isUnread = item.isUnread !== false;
              return (
                <TouchableOpacity
                  style={[styles.gridArticleItem, { backgroundColor: colors.background.tertiary }]}
                  onPress={() => openArticleUrl(item)}
                  onLongPress={() => handleGridLongPress(item)}
                  delayLongPress={400}
                >
                  {/* Unread indicator dot */}
                  {isUnread && (
                    <View style={styles.gridUnreadDot} />
                  )}
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.gridArticleImage} />
                  ) : (
                    <View style={[styles.gridArticleImagePlaceholder, { backgroundColor: colors.accent.bg }]}>
                      <Icon name="globe-outline" size={24} color={colors.accent.primary} />
                    </View>
                  )}
                  <View style={styles.gridArticleContent}>
                    <Text
                      style={[
                        styles.gridArticleTitle,
                        { color: colors.text.primary },
                        !isUnread && styles.gridArticleTitleRead,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title || 'Untitled'}
                    </Text>
                    <View style={styles.gridArticleMeta}>
                      <Text style={[styles.gridArticlePlatform, { color: colors.text.tertiary }]}>
                        {item.platform || 'Web'}
                      </Text>
                      <Text style={[styles.gridArticleTime, { color: colors.text.tertiary }]}>
                        {getTimeSince(item.savedAt)}
                      </Text>
                      {!isUnread && (
                        <View style={styles.gridReadBadge}>
                          <Icon name="checkmark-circle" size={12} color="#10B981" />
                          <Text style={styles.gridReadBadgeText}>Read</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.gridBookmarkBtn,
                      { backgroundColor: item.isBookmarked ? '#FEF3C7' : colors.background.secondary }
                    ]}
                    onPress={() => handleToggleBookmark(item)}
                  >
                    <Icon
                      name={item.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                      size={18}
                      color={item.isBookmarked ? '#F59E0B' : colors.text.tertiary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.gridArticleList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.gridEmptyContainer}>
                <Icon name="search-outline" size={48} color={colors.text.tertiary} />
                <Text style={[styles.gridEmptyText, { color: colors.text.secondary }]}>
                  {gridSearchQuery ? 'No articles found' : 'No articles yet'}
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        // Custom Stack view - Folders
        <View style={styles.customContainer}>
          {selectedFolder ? (
            // Show selected folder articles
            <View style={styles.tagFolderContent}>
              {/* Folder header */}
              <View style={styles.tagFolderHeader}>
                <TouchableOpacity
                  style={[styles.backButton, { backgroundColor: colors.background.secondary }]}
                  onPress={handleCloseFolder}
                >
                  <Icon name="arrow-back" size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.tagFolderTitle, { color: colors.text.primary }]}>
                  {selectedFolder.name}
                </Text>
                <Text style={[styles.tagFolderCount, { color: colors.text.secondary }]}>
                  {folderArticles.length} articles
                </Text>
              </View>

              {/* View mode toggle */}
              <View style={styles.folderViewToggle}>
                <TouchableOpacity
                  style={[
                    styles.folderViewToggleButton,
                    { backgroundColor: folderViewMode === 'stack' ? colors.accent.primary : colors.background.secondary },
                  ]}
                  onPress={() => setFolderViewMode('stack')}
                >
                  <Icon name="layers" size={16} color={folderViewMode === 'stack' ? '#FFFFFF' : colors.text.secondary} />
                  <Text style={[styles.folderViewToggleText, { color: folderViewMode === 'stack' ? '#FFFFFF' : colors.text.secondary }]}>
                    Stack
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.folderViewToggleButton,
                    { backgroundColor: folderViewMode === 'grid' ? colors.accent.primary : colors.background.secondary },
                  ]}
                  onPress={() => setFolderViewMode('grid')}
                >
                  <Icon name="grid" size={16} color={folderViewMode === 'grid' ? '#FFFFFF' : colors.text.secondary} />
                  <Text style={[styles.folderViewToggleText, { color: folderViewMode === 'grid' ? '#FFFFFF' : colors.text.secondary }]}>
                    Grid
                  </Text>
                </TouchableOpacity>

                {/* Delete folder button */}
                <TouchableOpacity
                  style={[styles.folderDeleteButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                  onPress={() => handleDeleteFolder(selectedFolder)}
                >
                  <Icon name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Folder articles - Stack or Grid view */}
              {folderViewMode === 'stack' ? (
                // Stack view with swipe cards
                <View style={styles.folderCardsContainer}>
                  {folderArticles.length > 0 ? (
                    // Visible cards stack
                    folderArticles
                      .slice(folderArticleIndex, folderArticleIndex + 3)
                      .reverse()
                      .map((article, idx) => {
                        const reversedIdx = folderArticles.slice(folderArticleIndex, folderArticleIndex + 3).length - 1 - idx;
                        return (
                          <NotifSwipeCard
                            key={`folder-${article.id}-${folderArticleIndex}-${folderCardResetKey}`}
                            article={article}
                            onSwipeLeft={handleFolderSwipeLeft}
                            onSwipeRight={handleFolderSwipeRight}
                            onTagsSaved={loadArticles}
                            isTopCard={reversedIdx === 0}
                            colors={colors}
                            isDarkMode={isDark}
                            overlayMode="open"
                            stackIndex={reversedIdx}
                          />
                        );
                      })
                  ) : (
                    <View style={styles.emptyTagFolder}>
                      <Icon name="folder-open-outline" size={48} color={colors.text.tertiary} />
                      <Text style={[styles.emptyTagText, { color: colors.text.secondary }]}>
                        No articles in this folder
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                // Grid/List view
                <FlatList
                  data={folderArticles}
                  renderItem={({ item }) => {
                    const platform = (item.platform?.toLowerCase() || 'web') as PlatformType;
                    const platformConfig = getPlatformConfig(platform);
                    return (
                      <TouchableOpacity
                        style={[styles.tagArticleItem, { backgroundColor: colors.background.secondary }]}
                        onPress={() => openArticleUrl(item)}
                      >
                        <View style={[styles.tagArticlePlatform, { backgroundColor: platformConfig.color }]}>
                          <Icon name={platformConfig.icon} size={14} color="#FFFFFF" />
                        </View>
                        <View style={styles.tagArticleContent}>
                          <Text style={[styles.tagArticleTitle, { color: colors.text.primary }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={[styles.tagArticleTime, { color: colors.text.tertiary }]}>
                            {getTimeSince(item.savedAt)}
                          </Text>
                        </View>
                        <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    );
                  }}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.tagArticlesList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyTagFolder}>
                      <Icon name="folder-open-outline" size={48} color={colors.text.tertiary} />
                      <Text style={[styles.emptyTagText, { color: colors.text.secondary }]}>
                        No articles in this folder
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          ) : showBookmarksFolder ? (
            // Show bookmarked articles
            <View style={styles.tagFolderContent}>
              {/* Bookmarks folder header */}
              <View style={styles.tagFolderHeader}>
                <TouchableOpacity
                  style={[styles.backButton, { backgroundColor: colors.background.secondary }]}
                  onPress={handleCloseBookmarksFolder}
                >
                  <Icon name="arrow-back" size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.tagFolderTitle, { color: colors.text.primary }]}>
                  Bookmarks
                </Text>
                <Text style={[styles.tagFolderCount, { color: colors.text.secondary }]}>
                  {bookmarkedArticles.length} articles
                </Text>
              </View>

              {/* Bookmarked articles */}
              <FlatList
                data={bookmarkedArticles}
                renderItem={({ item }) => {
                  const platform = (item.platform?.toLowerCase() || 'web') as PlatformType;
                  const platformConfig = getPlatformConfig(platform);
                  return (
                    <TouchableOpacity
                      style={[styles.tagArticleItem, { backgroundColor: colors.background.secondary }]}
                      onPress={() => openArticleUrl(item)}
                    >
                      <View style={[styles.tagArticlePlatform, { backgroundColor: platformConfig.color }]}>
                        <Icon name={platformConfig.icon} size={14} color="#FFFFFF" />
                      </View>
                      <View style={styles.tagArticleContent}>
                        <Text style={[styles.tagArticleTitle, { color: colors.text.primary }]} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={[styles.tagArticleTime, { color: colors.text.tertiary }]}>
                          {getTimeSince(item.savedAt)}
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.tagArticlesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyTagFolder}>
                    <Icon name="bookmark-outline" size={48} color={colors.text.tertiary} />
                    <Text style={[styles.emptyTagText, { color: colors.text.secondary }]}>
                      No bookmarked articles yet
                    </Text>
                  </View>
                }
              />
            </View>
          ) : (folders.length > 0 || bookmarkedArticles.length > 0) ? (
            // Show folders list with search
            <View style={styles.tagFoldersContainer}>
              <View style={styles.tagFoldersHeader}>
                <Icon name="folder" size={24} color={colors.accent.primary} />
                <Text style={[styles.tagFoldersTitle, { color: colors.text.primary }]}>
                  Custom Stacks
                </Text>
              </View>
              <Text style={[styles.tagFoldersSubtitle, { color: colors.text.secondary }]}>
                Your saved folders and bookmarks
              </Text>

              {/* Folder search */}
              {folders.length > 0 && (
                <View style={[styles.folderSearchBar, { backgroundColor: colors.background.secondary }]}>
                  <Icon name="search" size={18} color={colors.text.tertiary} />
                  <TextInput
                    style={[styles.folderSearchInput, { color: colors.text.primary }]}
                    placeholder="Search folders..."
                    placeholderTextColor={colors.text.tertiary}
                    value={folderSearchQuery}
                    onChangeText={setFolderSearchQuery}
                  />
                  {folderSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setFolderSearchQuery('')}>
                      <Icon name="close-circle" size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Folders and Bookmarks list */}
              <FlatList
                data={[
                  // Add bookmarks as first item if exists
                  ...(bookmarkedArticles.length > 0 ? [{ type: 'bookmarks' as const }] : []),
                  // Add folders
                  ...filteredFolders.map(f => ({ type: 'folder' as const, folder: f })),
                ]}
                renderItem={({ item }) => {
                  if (item.type === 'bookmarks') {
                    return (
                      <TouchableOpacity
                        style={[styles.tagFolderCard, { backgroundColor: colors.background.secondary }]}
                        onPress={handleOpenBookmarksFolder}
                      >
                        <View style={[styles.tagFolderIcon, { backgroundColor: '#F59E0B' }]}>
                          <Icon name="bookmark" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.tagFolderInfo}>
                          <Text style={[styles.tagFolderName, { color: colors.text.primary }]}>
                            Bookmarks
                          </Text>
                          <Text style={[styles.tagFolderArticleCount, { color: colors.text.secondary }]}>
                            {bookmarkedArticles.length} {bookmarkedArticles.length === 1 ? 'article' : 'articles'}
                          </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    );
                  } else {
                    const folder = item.folder!;
                    return (
                      <TouchableOpacity
                        style={[styles.tagFolderCard, { backgroundColor: colors.background.secondary }]}
                        onPress={() => handleOpenFolder(folder)}
                        onLongPress={() => handleDeleteFolder(folder)}
                        delayLongPress={500}
                      >
                        <View style={[styles.tagFolderIcon, { backgroundColor: colors.accent.primary }]}>
                          <Icon name="folder" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.tagFolderInfo}>
                          <Text style={[styles.tagFolderName, { color: colors.text.primary }]}>
                            {folder.name}
                          </Text>
                          <Text style={[styles.tagFolderArticleCount, { color: colors.text.secondary }]}>
                            {folder.articleCount} {folder.articleCount === 1 ? 'article' : 'articles'}
                          </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    );
                  }
                }}
                keyExtractor={(item) => item.type === 'bookmarks' ? 'bookmarks' : item.folder!.id}
                contentContainerStyle={styles.tagFoldersList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  folderSearchQuery ? (
                    <View style={styles.emptyTagFolder}>
                      <Icon name="search-outline" size={48} color={colors.text.tertiary} />
                      <Text style={[styles.emptyTagText, { color: colors.text.secondary }]}>
                        No folders matching "{folderSearchQuery}"
                      </Text>
                    </View>
                  ) : null
                }
              />
            </View>
          ) : (
            // Empty state - no folders or bookmarks yet
            <View style={styles.emptyCustomContainer}>
              <View style={[styles.emptyTagIconContainer, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
                <Icon name="folder-outline" size={48} color="#F59E0B" />
              </View>
              <Text style={[styles.customTitle, { color: colors.text.primary }]}>
                No Stacks Yet
              </Text>
              <Text style={[styles.customSubtitle, { color: colors.text.secondary }]}>
                Save priority articles as folders to organize your reading.
              </Text>
            </View>
          )}
        </View>
      )}


      {/* View mode selector */}
      <View style={styles.navBarWrapper}>
        {renderViewModeSelector()}
      </View>

      {/* Add Link Modal */}
      <AddLinkModal
        visible={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        isDarkMode={isDark}
        colors={colors}
        onLinkAdded={loadArticles}
      />

      {/* Search Modal */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        articles={[...allArticles, ...priorityArticles]}
        onArticleSelect={handleViewArticle}
        onArticleDeleted={loadArticles}
        onArticleTagged={loadArticles}
        isDarkMode={isDark}
        colors={colors}
      />

      {/* Grid Action Menu Modal */}
      <Modal
        visible={showGridActionMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGridActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.gridActionMenuOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowGridActionMenu(false);
            setShowGridTagInput(false);
            setSelectedGridArticle(null);
          }}
        >
          <View style={[styles.gridActionMenuContainer, { backgroundColor: colors.background.primary }]}>
            <Text style={[styles.gridActionMenuTitle, { color: colors.text.primary }]} numberOfLines={2}>
              {selectedGridArticle?.title || 'Article'}
            </Text>

            {showGridTagInput ? (
              <View style={styles.gridTagInputContainer}>
                <TextInput
                  style={[styles.gridTagInput, { backgroundColor: colors.background.secondary, color: colors.text.primary }]}
                  placeholder="Enter new tag name..."
                  placeholderTextColor={colors.text.tertiary}
                  value={gridCustomTag}
                  onChangeText={setGridCustomTag}
                  autoFocus
                />
                <View style={styles.gridTagInputButtons}>
                  <TouchableOpacity
                    style={[styles.gridTagInputButton, { backgroundColor: colors.background.secondary }]}
                    onPress={() => setShowGridTagInput(false)}
                  >
                    <Text style={{ color: colors.text.secondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.gridTagInputButton, { backgroundColor: colors.accent.primary }]}
                    onPress={handleGridAddTag}
                  >
                    <Text style={{ color: '#FFFFFF' }}>Add Tag</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.gridActionMenuScrollContainer}>
                {/* Mark as Read/Unread */}
                <TouchableOpacity
                  style={[styles.gridActionMenuItem, { backgroundColor: colors.background.secondary }]}
                  onPress={handleGridToggleReadStatus}
                >
                  <Icon
                    name={selectedGridArticle?.isUnread === false ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.accent.primary}
                  />
                  <Text style={[styles.gridActionMenuItemText, { color: colors.text.primary }]}>
                    {selectedGridArticle?.isUnread === false ? 'Mark as Unread' : 'Mark as Read'}
                  </Text>
                </TouchableOpacity>

                {/* Existing Tags Section */}
                {existingTags.length > 0 && (
                  <View style={styles.gridExistingTagsSection}>
                    <Text style={[styles.gridExistingTagsLabel, { color: colors.text.secondary }]}>
                      Add to existing tag:
                    </Text>
                    <View style={styles.gridExistingTagsContainer}>
                      {existingTags.map((tag, index) => {
                        const tagColors = ['#8B5CF6', '#EC4899', '#10B981', '#3B82F6', '#EF4444', '#06B6D4'];
                        const tagColor = tagColors[index % tagColors.length];
                        const isAlreadyTagged = selectedGridArticle?.tags?.some(
                          t => t.toLowerCase() === tag.toLowerCase()
                        );
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[
                              styles.gridExistingTagChip,
                              { backgroundColor: isAlreadyTagged ? colors.background.tertiary : tagColor },
                              isAlreadyTagged && { opacity: 0.5 }
                            ]}
                            onPress={() => !isAlreadyTagged && handleGridAddExistingTag(tag)}
                            disabled={isAlreadyTagged}
                          >
                            <Icon
                              name={isAlreadyTagged ? 'checkmark' : 'pricetag'}
                              size={12}
                              color="#FFFFFF"
                            />
                            <Text style={styles.gridExistingTagChipText}>{tag}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Create New Tag */}
                <TouchableOpacity
                  style={[styles.gridActionMenuItem, { backgroundColor: colors.background.secondary }]}
                  onPress={() => setShowGridTagInput(true)}
                >
                  <Icon name="add-circle-outline" size={20} color={colors.accent.primary} />
                  <Text style={[styles.gridActionMenuItemText, { color: colors.text.primary }]}>
                    Create New Tag
                  </Text>
                </TouchableOpacity>

                {/* Delete Article */}
                <TouchableOpacity
                  style={[styles.gridActionMenuItem, { backgroundColor: colors.background.secondary }]}
                  onPress={handleGridDeleteArticle}
                >
                  <Icon name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.gridActionMenuItemText, { color: '#EF4444' }]}>
                    Delete Article
                  </Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity
                  style={[styles.gridActionMenuCancel, { backgroundColor: colors.background.secondary }]}
                  onPress={() => {
                    setShowGridActionMenu(false);
                    setSelectedGridArticle(null);
                  }}
                >
                  <Text style={[styles.gridActionMenuCancelText, { color: colors.text.secondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Responsive styles using dynamic sizing
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(16),
    paddingVertical: hp(12),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
  },
  headerButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(12),
    paddingVertical: hp(8),
    borderRadius: ms(18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  priorityCount: {
    color: 'white',
    fontSize: fp(14),
    fontWeight: '600',
    marginLeft: wp(5),
  },
  settingsButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  stacksContainer: {
    flex: 1,
    alignItems: 'center',
  },
  titleContainer: {
    marginTop: hp(20),
    alignItems: 'center',
  },
  appTitle: {
    fontFamily: 'Courier',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
  },
  appSubtitle: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  cardsContainer: {
    position: 'absolute',
    top: hp(115),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(24),
  },
  emptyIconContainer: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(20),
  },
  emptyTitle: {
    fontSize: fp(20),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: hp(10),
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: fp(13),
    textAlign: 'center',
    lineHeight: hp(20),
    marginBottom: hp(24),
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: wp(12),
  },
  folderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(12),
    paddingHorizontal: wp(16),
    borderRadius: ms(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  folderInfo: {
    marginLeft: wp(8),
  },
  folderLabel: {
    color: 'white',
    fontSize: fp(11),
    fontWeight: '500',
    marginBottom: 2,
  },
  folderCount: {
    color: 'white',
    fontSize: fp(16),
    fontWeight: '700',
  },
  instructionsBox: {
    position: 'absolute',
    bottom: hp(10),
    left: wp(20),
    right: wp(20),
    padding: wp(16),
    borderRadius: ms(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(6),
  },
  instructionIconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  instructionEmoji: {
    fontSize: fp(18),
    marginRight: wp(8),
  },
  instructionEmojiBox: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(8),
  },
  instructionDivider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    marginVertical: hp(8),
    marginHorizontal: wp(20),
  },
  instructionText: {
    fontSize: fp(14),
  },
  instructionBold: {
    fontWeight: '700',
  },
  instructionsTextOnly: {
    position: 'absolute',
    bottom: hp(5),
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: hp(2),
  },
  instructionRowSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
  },
  instructionTextSimple: {
    fontSize: fp(12),
    fontWeight: '400',
  },
  navBarWrapper: {
    paddingHorizontal: wp(20),
    paddingBottom: hp(55),
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gridList: {
    padding: wp(16),
    paddingBottom: hp(8),
  },
  gridItem: {
    borderRadius: ms(16),
    overflow: 'hidden',
    marginBottom: hp(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  gridItemVideo: {
    height: hp(200),
  },
  gridImage: {
    width: '100%',
    height: hp(180),
  },
  gridThumbnailContainer: {
    height: hp(85),
    borderRadius: ms(10),
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: wp(8),
    marginTop: wp(8),
  },
  gridThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  gridPlatformBadgeOverlay: {
    position: 'absolute',
    top: wp(8),
    left: wp(8),
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridVideoContentBelow: {
    padding: wp(8),
    paddingTop: wp(4),
  },
  gridVideoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(4),
  },
  gridPriorityButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Uniform grid item styles
  gridItemUniform: {
    borderRadius: ms(16),
    overflow: 'hidden',
    marginBottom: hp(12),
    height: hp(180),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  gridThumbnailUniform: {
    height: hp(110),
    width: '100%',
    position: 'relative',
  },
  gridPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBookmarkButton: {
    position: 'absolute',
    top: wp(8),
    right: wp(8),
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContentUniform: {
    flex: 1,
    padding: wp(10),
    justifyContent: 'space-between',
  },
  gridFooterUniform: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridImageFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ms(20),
  },
  gridGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    borderBottomLeftRadius: ms(20),
    borderBottomRightRadius: ms(20),
  },
  gridPlatformBadge: {
    position: 'absolute',
    top: wp(12),
    left: wp(12),
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridVideoContent: {
    position: 'absolute',
    bottom: wp(12),
    left: wp(12),
    right: wp(50),
  },
  gridVideoTitle: {
    fontSize: fp(14),
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: fp(20),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridVideoTime: {
    fontSize: fp(11),
    color: 'rgba(255,255,255,0.8)',
    marginTop: hp(4),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridVideoPriority: {
    position: 'absolute',
    bottom: wp(12),
    right: wp(12),
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: wp(14),
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: wp(8),
    paddingVertical: hp(5),
    borderRadius: ms(10),
    marginBottom: hp(8),
    gap: wp(4),
  },
  sourceBadgeText: {
    fontSize: fp(11),
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  sourceBadgeTextWhite: {
    fontSize: fp(11),
    fontWeight: '500',
    textTransform: 'capitalize',
    color: '#FFFFFF',
  },
  gridDescription: {
    fontSize: fp(12),
    lineHeight: fp(18),
    marginBottom: hp(6),
  },
  gridTitle: {
    fontSize: fp(12),
    fontWeight: '700',
    lineHeight: hp(17),
    marginBottom: hp(4),
  },
  gridTime: {
    fontSize: fp(11),
    marginBottom: hp(12),
  },
  gridActions: {
    flexDirection: 'row',
    gap: wp(6),
  },
  gridActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(10),
    borderRadius: ms(10),
    gap: wp(5),
  },
  gridActionText: {
    fontSize: fp(12),
    fontWeight: '600',
  },
  customContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(24),
  },
  customTitle: {
    fontSize: fp(20),
    fontWeight: '700',
    textAlign: 'center',
    marginTop: hp(20),
    marginBottom: hp(10),
  },
  customSubtitle: {
    fontSize: fp(14),
    textAlign: 'center',
    lineHeight: hp(22),
  },
  // Tag Folders styles
  tagFoldersContainer: {
    flex: 1,
    paddingTop: hp(20),
    width: '100%',
  },
  tagFoldersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(8),
    marginBottom: hp(4),
  },
  tagFoldersTitle: {
    fontSize: fp(22),
    fontWeight: '700',
  },
  tagFoldersSubtitle: {
    fontSize: fp(13),
    textAlign: 'center',
    marginBottom: hp(20),
  },
  tagFoldersList: {
    paddingHorizontal: wp(16),
    paddingBottom: hp(20),
  },
  tagFolderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(14),
    borderRadius: ms(16),
    marginBottom: hp(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  tagFolderIcon: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagFolderInfo: {
    flex: 1,
    marginLeft: wp(14),
  },
  tagFolderName: {
    fontSize: fp(16),
    fontWeight: '600',
    marginBottom: hp(2),
  },
  tagFolderArticleCount: {
    fontSize: fp(12),
  },
  emptyCustomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(24),
  },
  emptyTagIconContainer: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(20),
  },
  // Tag Folder Content (when viewing articles in a folder)
  tagFolderContent: {
    flex: 1,
    width: '100%',
  },
  tagFolderHeader: {
    alignItems: 'center',
    paddingVertical: hp(16),
    paddingHorizontal: wp(16),
  },
  backButton: {
    position: 'absolute',
    left: wp(16),
    top: hp(16),
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagFolderTitle: {
    fontSize: fp(20),
    fontWeight: '700',
    marginBottom: hp(4),
  },
  tagFolderCount: {
    fontSize: fp(13),
  },
  tagArticlesList: {
    paddingHorizontal: wp(16),
    paddingBottom: hp(20),
  },
  tagArticleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(12),
    borderRadius: ms(12),
    marginBottom: hp(8),
  },
  tagArticlePlatform: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagArticleContent: {
    flex: 1,
    marginLeft: wp(12),
    marginRight: wp(8),
  },
  tagArticleTitle: {
    fontSize: fp(14),
    fontWeight: '600',
    lineHeight: fp(20),
  },
  tagArticleTime: {
    fontSize: fp(11),
    marginTop: hp(2),
  },
  emptyTagFolder: {
    alignItems: 'center',
    paddingVertical: hp(40),
  },
  emptyTagText: {
    fontSize: fp(14),
    marginTop: hp(12),
  },
  // Grid Search View Styles
  gridSearchContainer: {
    flex: 1,
  },
  gridSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(16),
    marginTop: hp(8),
    paddingHorizontal: wp(16),
    paddingVertical: hp(12),
    borderRadius: ms(14),
    gap: wp(10),
  },
  gridSearchInput: {
    flex: 1,
    fontSize: fp(16),
    padding: 0,
  },
  gridFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(16),
    paddingVertical: hp(12),
    gap: wp(10),
  },
  gridFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(14),
    paddingVertical: hp(8),
    borderRadius: ms(20),
    gap: wp(6),
  },
  gridFilterButtonText: {
    fontSize: fp(13),
    fontWeight: '600',
  },
  gridArticleList: {
    padding: wp(16),
    paddingTop: hp(8),
  },
  gridArticleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(12),
    borderRadius: ms(14),
    marginBottom: hp(10),
  },
  gridArticleImage: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(10),
  },
  gridArticleImagePlaceholder: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridArticleContent: {
    flex: 1,
    marginLeft: wp(12),
    marginRight: wp(8),
  },
  gridArticleTitle: {
    fontSize: fp(14),
    fontWeight: '600',
    marginBottom: hp(4),
  },
  gridArticleTitleRead: {
    opacity: 0.7,
  },
  gridArticleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
  },
  gridArticlePlatform: {
    fontSize: fp(12),
    textTransform: 'capitalize',
  },
  gridArticleTime: {
    fontSize: fp(12),
  },
  gridUnreadDot: {
    position: 'absolute',
    top: wp(12),
    left: wp(4),
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: '#3B82F6',
  },
  gridReadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    marginLeft: wp(4),
  },
  gridReadBadgeText: {
    fontSize: fp(11),
    color: '#10B981',
    fontWeight: '500',
  },
  gridEmptyContainer: {
    alignItems: 'center',
    paddingTop: hp(60),
  },
  gridEmptyText: {
    fontSize: fp(16),
    marginTop: hp(16),
  },
  gridBookmarkBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(8),
  },
  // Grid Action Menu Styles
  gridActionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(20),
  },
  gridActionMenuContainer: {
    width: '100%',
    maxWidth: wp(320),
    borderRadius: ms(16),
    padding: wp(20),
  },
  gridActionMenuTitle: {
    fontSize: fp(16),
    fontWeight: '600',
    marginBottom: hp(16),
    textAlign: 'center',
  },
  gridActionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(14),
    borderRadius: ms(12),
    marginBottom: hp(10),
    gap: wp(12),
  },
  gridActionMenuItemText: {
    fontSize: fp(15),
    fontWeight: '500',
  },
  gridActionMenuCancel: {
    alignItems: 'center',
    padding: wp(14),
    borderRadius: ms(12),
    marginTop: hp(6),
  },
  gridActionMenuCancelText: {
    fontSize: fp(15),
    fontWeight: '500',
  },
  gridTagInputContainer: {
    marginTop: hp(8),
  },
  gridTagInput: {
    padding: wp(14),
    borderRadius: ms(12),
    fontSize: fp(15),
    marginBottom: hp(12),
  },
  gridTagInputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(10),
  },
  gridTagInputButton: {
    flex: 1,
    alignItems: 'center',
    padding: wp(12),
    borderRadius: ms(12),
  },
  // Existing Tags Styles
  gridActionMenuScrollContainer: {
    maxHeight: hp(400),
  },
  gridExistingTagsSection: {
    marginBottom: hp(12),
  },
  gridExistingTagsLabel: {
    fontSize: fp(13),
    fontWeight: '500',
    marginBottom: hp(10),
  },
  gridExistingTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(8),
  },
  gridExistingTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(10),
    paddingVertical: hp(6),
    borderRadius: ms(16),
    gap: wp(4),
  },
  gridExistingTagChipText: {
    fontSize: fp(12),
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // Folder view styles
  folderViewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(16),
    paddingVertical: hp(12),
    gap: wp(10),
  },
  folderViewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(14),
    paddingVertical: hp(8),
    borderRadius: ms(20),
    gap: wp(6),
  },
  folderViewToggleText: {
    fontSize: fp(13),
    fontWeight: '600',
  },
  folderDeleteButton: {
    marginLeft: 'auto',
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(16),
    marginBottom: hp(12),
    paddingHorizontal: wp(14),
    paddingVertical: hp(10),
    borderRadius: ms(12),
    gap: wp(10),
  },
  folderSearchInput: {
    flex: 1,
    fontSize: fp(15),
    padding: 0,
  },
  // Folder cards stack view
  folderCardsContainer: {
    position: 'absolute',
    top: '28%',
    left: -wp(24),
    right: -wp(24),
    bottom: '8%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
