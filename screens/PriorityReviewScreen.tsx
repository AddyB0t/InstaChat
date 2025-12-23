/**
 * Priority Review Screen
 * Review articles marked as priority (bookmarked)
 * Swipe right to open, left to skip
 * Styled like NotifHomeScreen with Grid and Stacks views
 */

import React, { useState, useCallback } from 'react';
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
  Alert,
  DeviceEventEmitter,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import {
  Article,
  Folder,
  getAllArticles,
  getAllFolders,
  updateArticle,
  deleteArticle,
  createFolder,
  getFolderByName,
  addArticlesToFolder,
} from '../services/database';
import NotifSwipeCard from '../components/NotifSwipeCard';
import SearchModal from '../components/SearchModal';
import { wp, hp, fp, ms } from '../utils/responsive';
import { isVideoPlatform, getPlatformConfig, PlatformType } from '../styles/platformColors';

type ViewMode = 'stacks' | 'grid';

export default function PriorityReviewScreen({ navigation }: any) {
  const { settings, getThemedColors } = useTheme();
  const systemColorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  const colors = getThemedColors(isDark);

  const [priorityArticles, setPriorityArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardResetKey, setCardResetKey] = useState(0);
  const [selectedView, setSelectedView] = useState<ViewMode>('stacks');
  const [loading, setLoading] = useState(true);
  const [swipeHistory, setSwipeHistory] = useState<number[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [existingFolder, setExistingFolder] = useState<{ id: string; name: string } | null>(null);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [openedArticleIds, setOpenedArticleIds] = useState<Set<number>>(new Set());

  // Folder picker state (single article)
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [articleToAddToFolder, setArticleToAddToFolder] = useState<Article | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  // Save all to folder state
  const [showSaveAllFolderPicker, setShowSaveAllFolderPicker] = useState(false);
  const [saveAllFolderName, setSaveAllFolderName] = useState('');

  const loadPriorityArticles = useCallback(async () => {
    try {
      setLoading(true);
      const allArticles = await getAllArticles();
      const priority = allArticles.filter(a => a.isBookmarked);
      setPriorityArticles(priority);
      setCurrentIndex(0);

      // Load folders for folder picker
      const allFolders = await getAllFolders();
      setFolders(allFolders);
    } catch (error) {
      console.error('[PriorityReviewScreen] Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Silent refresh without loading state (for Return to Stack)
  const refreshPriorityArticles = useCallback(async () => {
    try {
      const allArticles = await getAllArticles();
      const priority = allArticles.filter(a => a.isBookmarked);
      setPriorityArticles(priority);
      // Don't reset currentIndex to avoid jump
    } catch (error) {
      console.error('[PriorityReviewScreen] Error refreshing articles:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPriorityArticles();
    }, [loadPriorityArticles])
  );

  // Get visible cards for stack
  const getVisibleCards = () => {
    if (priorityArticles.length === 0) return [];
    const visible = [];
    for (let i = 0; i < Math.min(3, priorityArticles.length); i++) {
      const index = (currentIndex + i) % priorityArticles.length;
      visible.push(priorityArticles[index]);
    }
    return visible;
  };

  const visibleCards = getVisibleCards();

  const handleSwipeLeft = (articleId: number) => {
    // Skip - cycle to bottom of stack
    setSwipeHistory(prev => [...prev, articleId]);

    // If only 1 card, force re-render by incrementing reset key
    if (priorityArticles.length === 1) {
      setCardResetKey(prev => prev + 1);
    } else {
      setCurrentIndex(prev => (prev + 1) % priorityArticles.length);
    }
  };

  const handleSwipeRight = async (articleId: number) => {
    // Open in browser and mark as read
    const article = priorityArticles.find(a => a.id === articleId);
    if (article?.url) {
      try {
        // Mark as read
        await updateArticle(articleId, { isUnread: false });

        // Track opened article
        const newOpenedIds = new Set(openedArticleIds);
        newOpenedIds.add(articleId);
        setOpenedArticleIds(newOpenedIds);

        // Add to history and cycle to next card (like swipe left)
        setSwipeHistory(prev => [...prev, articleId]);
        setCurrentIndex(prev => (prev + 1) % priorityArticles.length);

        // Open the URL
        await Linking.openURL(article.url);

        // Check if all articles have been opened
        if (newOpenedIds.size === priorityArticles.length && priorityArticles.length > 0) {
          // Small delay to let user see the result
          setTimeout(() => {
            Alert.alert(
              'All Done!',
              'You\'ve opened all priority articles. Would you like to move them back to the main feed?',
              [
                { text: 'Keep in Priority', style: 'cancel' },
                {
                  text: 'Move to Main Feed',
                  onPress: async () => {
                    try {
                      for (const art of priorityArticles) {
                        await updateArticle(art.id, { isBookmarked: false });
                      }
                      setPriorityArticles([]);
                      setOpenedArticleIds(new Set());
                      // Emit refresh event so NotifHomeScreen reloads articles
                      DeviceEventEmitter.emit('refreshArticles');
                      navigation.goBack();
                    } catch (error) {
                      console.error('Error moving articles:', error);
                    }
                  },
                },
              ]
            );
          }, 500);
        }
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
    }
  };

  const handleDelete = async (articleId: number) => {
    try {
      await deleteArticle(articleId);
      const updated = priorityArticles.filter(a => a.id !== articleId);
      setPriorityArticles(updated);
      if (updated.length > 0 && currentIndex >= updated.length) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('[PriorityReviewScreen] Error deleting article:', error);
    }
  };

  const handleUndo = () => {
    if (swipeHistory.length === 0) return;
    const lastId = swipeHistory[swipeHistory.length - 1];
    setSwipeHistory(prev => prev.slice(0, -1));
    const lastIndex = priorityArticles.findIndex(a => a.id === lastId);
    if (lastIndex !== -1) {
      setCurrentIndex(lastIndex);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...priorityArticles].sort(() => Math.random() - 0.5);
    setPriorityArticles(shuffled);
    setCurrentIndex(0);
  };

  const handleMoveBack = () => {
    if (priorityArticles.length === 0) return;

    Alert.alert(
      'Move to Main Feed',
      'Move articles back to the main feed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: async () => {
            try {
              // Move only the top card (current card)
              const topArticle = priorityArticles[currentIndex];
              if (topArticle) {
                await updateArticle(topArticle.id, { isBookmarked: false });
                const updated = priorityArticles.filter(a => a.id !== topArticle.id);
                setPriorityArticles(updated);
                if (updated.length === 0) {
                  navigation.goBack();
                } else if (currentIndex >= updated.length) {
                  setCurrentIndex(0);
                }
                // Emit refresh event
                DeviceEventEmitter.emit('refreshArticles');
              }
            } catch (error) {
              console.error('Error moving article:', error);
            }
          },
        },
        {
          text: 'Move All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const article of priorityArticles) {
                await updateArticle(article.id, { isBookmarked: false });
              }
              setPriorityArticles([]);
              DeviceEventEmitter.emit('refreshArticles');
              navigation.goBack();
            } catch (error) {
              console.error('Error moving articles:', error);
            }
          },
        },
      ]
    );
  };

  const handleViewArticle = (article: Article) => {
    navigation.navigate('ArticleDetail', { id: article.id });
  };

  // Mark article as read (from priority view)
  const handleMarkAsRead = async (articleId: number) => {
    try {
      await updateArticle(articleId, { isUnread: false });
      console.log('[PriorityReviewScreen] Marked article as read:', articleId);
    } catch (error) {
      console.error('[PriorityReviewScreen] Error marking as read:', error);
    }
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

  // Remove from priority (unmark bookmark)
  const handleRemoveFromPriority = async (articleId: number) => {
    try {
      await updateArticle(articleId, { isBookmarked: false });
      const updated = priorityArticles.filter(a => a.id !== articleId);
      setPriorityArticles(updated);
      if (updated.length > 0 && currentIndex >= updated.length) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('[PriorityReviewScreen] Error removing from priority:', error);
    }
  };

  // ===== FOLDER FUNCTIONS =====

  const handleOpenFolderModal = () => {
    if (priorityArticles.length === 0) {
      Alert.alert('No Articles', 'Add some articles to priority first before saving as a folder.');
      return;
    }
    setFolderName('');
    setExistingFolder(null);
    setShowDuplicatePrompt(false);
    setShowFolderModal(true);
  };

  const handleCheckFolderName = async () => {
    const trimmedName = folderName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a folder name.');
      return;
    }

    // Check if folder with same name exists
    const existing = await getFolderByName(trimmedName);
    if (existing) {
      setExistingFolder(existing);
      setShowDuplicatePrompt(true);
    } else {
      // Create new folder and save
      await handleCreateNewFolder(trimmedName);
    }
  };

  const handleCreateNewFolder = async (name: string) => {
    try {
      const folder = await createFolder(name);
      const articleIds = priorityArticles.map(a => a.id.toString());
      await addArticlesToFolder(folder.id, articleIds);

      // Unbookmark articles after adding to folder
      for (const article of priorityArticles) {
        await updateArticle(article.id, { isBookmarked: false });
      }

      setShowFolderModal(false);
      setShowDuplicatePrompt(false);
      setFolderName('');
      setPriorityArticles([]);

      Alert.alert(
        'Folder Created',
        `"${name}" folder created with ${articleIds.length} articles.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('[PriorityReviewScreen] Error creating folder:', error);
      Alert.alert('Error', 'Failed to create folder.');
    }
  };

  const handleAddToExistingFolder = async () => {
    if (!existingFolder) return;

    try {
      const articleIds = priorityArticles.map(a => a.id.toString());
      await addArticlesToFolder(existingFolder.id, articleIds);

      // Unbookmark articles after adding to folder
      for (const article of priorityArticles) {
        await updateArticle(article.id, { isBookmarked: false });
      }

      setShowFolderModal(false);
      setShowDuplicatePrompt(false);
      setFolderName('');
      setExistingFolder(null);
      setPriorityArticles([]);

      Alert.alert(
        'Added to Folder',
        `${articleIds.length} articles added to "${existingFolder.name}".`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('[PriorityReviewScreen] Error adding to folder:', error);
      Alert.alert('Error', 'Failed to add articles to folder.');
    }
  };

  // ===== SINGLE ARTICLE FOLDER PICKER =====

  const handleAddToFolderPress = (article: Article) => {
    setArticleToAddToFolder(article);
    setNewFolderName('');
    setShowFolderPicker(true);
  };

  const handleSelectFolder = async (folder: Folder) => {
    if (!articleToAddToFolder) return;

    try {
      await addArticlesToFolder(folder.id, [articleToAddToFolder.id.toString()]);

      // Emit refresh event
      DeviceEventEmitter.emit('refreshArticles');

      setShowFolderPicker(false);
      setArticleToAddToFolder(null);

      Alert.alert('Added to Folder', `Article added to "${folder.name}". It remains in Priority.`);
    } catch (error) {
      console.error('[PriorityReviewScreen] Error adding to folder:', error);
      Alert.alert('Error', 'Failed to add article to folder.');
    }
  };

  const handleCreateNewFolderForArticle = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName || !articleToAddToFolder) return;

    try {
      const folder = await createFolder(trimmedName);
      await addArticlesToFolder(folder.id, [articleToAddToFolder.id.toString()]);

      // Refresh folders list
      const allFolders = await getAllFolders();
      setFolders(allFolders);

      // Emit refresh event
      DeviceEventEmitter.emit('refreshArticles');

      setShowFolderPicker(false);
      setArticleToAddToFolder(null);
      setNewFolderName('');

      Alert.alert('Folder Created', `Article added to new folder "${trimmedName}". It remains in Priority.`);
    } catch (error) {
      console.error('[PriorityReviewScreen] Error creating folder:', error);
      Alert.alert('Error', 'Failed to create folder.');
    }
  };

  // ===== SAVE ALL ARTICLES TO FOLDER =====

  const handleSaveAllToFolderPress = () => {
    if (priorityArticles.length === 0) {
      Alert.alert('No Articles', 'There are no articles to save.');
      return;
    }
    setSaveAllFolderName('');
    setShowSaveAllFolderPicker(true);
  };

  const handleSaveAllToExistingFolder = async (folder: Folder) => {
    try {
      const articleIds = priorityArticles.map(a => a.id.toString());
      await addArticlesToFolder(folder.id, articleIds);

      // Unbookmark all articles
      for (const article of priorityArticles) {
        await updateArticle(article.id, { isBookmarked: false });
      }

      // Clear priority list
      setPriorityArticles([]);

      // Refresh folders list
      const allFolders = await getAllFolders();
      setFolders(allFolders);

      // Emit refresh event
      DeviceEventEmitter.emit('refreshArticles');

      setShowSaveAllFolderPicker(false);
      setSaveAllFolderName('');

      Alert.alert(
        'Saved to Folder',
        `${articleIds.length} articles saved to "${folder.name}".`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('[PriorityReviewScreen] Error saving all to folder:', error);
      Alert.alert('Error', 'Failed to save articles to folder.');
    }
  };

  const handleCreateNewFolderForAll = async () => {
    const trimmedName = saveAllFolderName.trim();
    if (!trimmedName || priorityArticles.length === 0) return;

    try {
      const folder = await createFolder(trimmedName);
      const articleIds = priorityArticles.map(a => a.id.toString());
      await addArticlesToFolder(folder.id, articleIds);

      // Unbookmark all articles
      for (const article of priorityArticles) {
        await updateArticle(article.id, { isBookmarked: false });
      }

      // Clear priority list
      setPriorityArticles([]);

      // Refresh folders list
      const allFolders = await getAllFolders();
      setFolders(allFolders);

      // Emit refresh event
      DeviceEventEmitter.emit('refreshArticles');

      setShowSaveAllFolderPicker(false);
      setSaveAllFolderName('');

      Alert.alert(
        'Folder Created',
        `${articleIds.length} articles saved to new folder "${trimmedName}".`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('[PriorityReviewScreen] Error creating folder for all:', error);
      Alert.alert('Error', 'Failed to create folder.');
    }
  };

  // Bottom navigation - switches view modes (Grid, Stacks)
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
    </View>
  );

  // Grid item renderer
  const renderGridItem = ({ item }: { item: Article }) => {
    const platform = (item.platform?.toLowerCase() || 'web') as PlatformType;
    const platformConfig = getPlatformConfig(platform);
    const isVideo = isVideoPlatform(platform);
    const hasThumbnail = item.imageUrl && isVideo;

    // Video platform layout: Contained thumbnail with title below
    if (hasThumbnail) {
      return (
        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: colors.background.secondary }]}
          onPress={() => handleViewArticle(item)}
        >
          {/* Thumbnail container */}
          <View style={styles.gridThumbnailContainer}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.gridThumbnailImage}
              resizeMode={platform === 'youtube' ? 'contain' : 'cover'}
            />
            {/* Platform badge */}
            <View style={[styles.gridPlatformBadgeOverlay, { backgroundColor: platformConfig.color }]}>
              <Icon name={platformConfig.icon} size={12} color="#FFFFFF" />
            </View>
          </View>
          {/* Content below thumbnail */}
          <View style={styles.gridVideoContentBelow}>
            <Text style={[styles.gridTitle, { color: colors.text.primary }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.gridVideoFooter}>
              <Text style={[styles.gridTime, { color: colors.text.tertiary }]}>
                {getTimeSince(item.savedAt)}
              </Text>
              {/* Open button */}
              <TouchableOpacity
                style={[styles.gridActionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                onPress={() => handleSwipeRight(item.id)}
              >
                <Icon name="open-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Text platform layout: Title + Description
    return (
      <TouchableOpacity
        style={[styles.gridItem, { backgroundColor: colors.background.secondary }]}
        onPress={() => handleViewArticle(item)}
      >
        <View style={styles.gridContent}>
          {/* Source badge */}
          <View style={[styles.sourceBadge, { backgroundColor: platformConfig.color }]}>
            <Icon name={platformConfig.icon} size={11} color="#FFFFFF" />
            <Text style={styles.sourceBadgeTextWhite}>
              {item.platform || 'Web'}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.gridTitle, { color: colors.text.primary }]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Description/Summary */}
          {item.summary && (
            <Text style={[styles.gridDescription, { color: colors.text.secondary }]} numberOfLines={2}>
              {item.summary}
            </Text>
          )}

          {/* Time */}
          <Text style={[styles.gridTime, { color: colors.text.tertiary }]}>
            {getTimeSince(item.savedAt)}
          </Text>

          {/* Action buttons */}
          <View style={styles.gridActions}>
            <TouchableOpacity
              style={[styles.gridActionButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
              onPress={() => handleSwipeRight(item.id)}
            >
              <Icon name="open-outline" size={18} color="#3B82F6" />
              <Text style={[styles.gridActionText, { color: '#3B82F6' }]}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Empty state
  if (!loading && priorityArticles.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Back Button */}
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            {/* Cards Count Badge */}
            <View style={[styles.countBadge, { backgroundColor: colors.accent.primary }]}>
              <Text style={styles.countText}>0 cards</Text>
            </View>

            {/* Settings Button */}
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.accent.bg }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="settings-sharp" size={20} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App title - NotiF style - always visible */}
        <View style={styles.stacksContainer}>
          <View style={styles.titleContainer}>
            <Text style={[styles.appTitle, { color: colors.accent.primary }]}>NotiF</Text>
            <Text style={[styles.appSubtitle, { color: colors.text.primary }]}>PRIORITY</Text>
          </View>

          {/* Empty state content */}
          <View style={styles.emptyContentContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
              <Icon name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              All Done!
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              You've reviewed all your priority articles.{'\n'}Head back to find more content!
            </Text>

            <TouchableOpacity
              style={[styles.backToMainButton, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backToMainText}>Back to Main Feed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* View mode selector */}
        <View style={[styles.navBarWrapper, { paddingBottom: hp(20) + insets.bottom }]}>
          {renderViewModeSelector()}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header with circular icon buttons */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Back Button */}
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {/* Cards Count Badge */}
          <TouchableOpacity
            style={[styles.countBadge, { backgroundColor: colors.accent.primary }]}
            onPress={handleMoveBack}
          >
            <Text style={styles.countText}>{priorityArticles.length} cards</Text>
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
        <View style={styles.stacksContainer}>
          {/* App title - NotiF style */}
          <View style={styles.titleContainer}>
            <Text style={[styles.appTitle, { color: colors.accent.primary }]}>NotiF</Text>
            <Text style={[styles.appSubtitle, { color: colors.text.primary }]}>PRIORITY</Text>
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
                onMarkAsRead={handleMarkAsRead}
                onTagsSaved={refreshPriorityArticles}
                onAddToFolder={handleAddToFolderPress}
                onAddStackToFolder={handleSaveAllToFolderPress}
                isTopCard={index === 0}
                colors={colors}
                isDarkMode={isDark}
                stackIndex={index}
                keepCardOnRightSwipe={true}
                overlayMode="open"
                isPriorityView={true}
              />
            ))}
          </View>
        </View>
      ) : (
        // Grid view
        <FlatList
          data={priorityArticles}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Swipe instructions (stacks view only) */}
      {selectedView === 'stacks' && priorityArticles.length > 0 && (
        <LinearGradient
          colors={isDark ? [colors.background.tertiary, colors.background.secondary] : [colors.background.secondary, colors.background.tertiary]}
          style={styles.instructionsBox}
        >
          <View style={styles.instructionRow}>
            <View style={[styles.instructionIconBox, { backgroundColor: colors.background.border }]}>
              <Icon name="arrow-back" size={14} color={isDark ? '#FFFFFF' : colors.text.primary} />
            </View>
            <View style={[styles.instructionEmojiBox, { backgroundColor: colors.accent.bg }]}>
              <Icon name="hand-left-outline" size={14} color={colors.accent.primary} />
            </View>
            <Text style={[styles.instructionText, { color: colors.text.secondary }]}>
              Swipe left to <Text style={[styles.instructionBold, { color: colors.text.primary }]}>Skip</Text>
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <View style={[styles.instructionIconBox, { backgroundColor: colors.accent.primary }]}>
              <Icon name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
            <View style={[styles.instructionEmojiBox, { backgroundColor: colors.accent.bg }]}>
              <Icon name="open-outline" size={14} color={colors.accent.primary} />
            </View>
            <Text style={[styles.instructionText, { color: colors.text.secondary }]}>
              Swipe right to <Text style={[styles.instructionBold, { color: colors.accent.primary }]}>Open</Text>
            </Text>
          </View>
        </LinearGradient>
      )}

      {/* View mode selector */}
      <View style={[styles.navBarWrapper, { paddingBottom: hp(20) + insets.bottom }]}>
        {renderViewModeSelector()}
      </View>

      {/* Search Modal */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        articles={priorityArticles}
        onArticleSelect={handleViewArticle}
        isDarkMode={isDark}
        colors={colors}
      />

      {/* Save as Folder Modal */}
      <Modal
        visible={showFolderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowFolderModal(false);
              setShowDuplicatePrompt(false);
            }}
          />
          <View style={[styles.folderModalContent, { backgroundColor: colors.background.secondary }]}>
            {/* Swipe indicator */}
            <View style={styles.modalSwipeIndicator}>
              <View style={[styles.swipeHandle, { backgroundColor: colors.text.tertiary }]} />
            </View>

            {/* Header */}
            <View style={styles.folderModalHeader}>
              <Icon name="folder-open" size={fp(28)} color={colors.accent.primary} />
              <Text style={[styles.folderModalTitle, { color: colors.text.primary }]}>
                Save as Folder
              </Text>
              <Text style={[styles.folderModalSubtitle, { color: colors.text.tertiary }]}>
                {priorityArticles.length} articles will be saved
              </Text>
            </View>

            {!showDuplicatePrompt ? (
              <>
                {/* Folder Name Input */}
                <View style={[styles.folderInputContainer, { borderColor: colors.accent.primary }]}>
                  <TextInput
                    style={[styles.folderInput, { color: colors.text.primary }]}
                    placeholder="Enter folder name..."
                    placeholderTextColor={colors.text.tertiary}
                    value={folderName}
                    onChangeText={setFolderName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCheckFolderName}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.folderModalButtons}>
                  <TouchableOpacity
                    style={[styles.folderCancelButton, { backgroundColor: colors.background.tertiary }]}
                    onPress={() => setShowFolderModal(false)}
                  >
                    <Text style={[styles.folderCancelText, { color: colors.text.secondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.folderSaveButton, { backgroundColor: colors.accent.primary }]}
                    onPress={handleCheckFolderName}
                  >
                    <Icon name="checkmark" size={fp(18)} color="#FFFFFF" />
                    <Text style={styles.folderSaveText}>Save Folder</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Duplicate Folder Prompt */}
                <View style={styles.duplicatePromptContainer}>
                  <Icon name="alert-circle" size={fp(24)} color={colors.accent.primary} />
                  <Text style={[styles.duplicatePromptText, { color: colors.text.primary }]}>
                    A folder named "{existingFolder?.name}" already exists.
                  </Text>
                  <Text style={[styles.duplicatePromptSubtext, { color: colors.text.tertiary }]}>
                    Would you like to add these articles to the existing folder or create a new one?
                  </Text>
                </View>

                {/* Duplicate Action Buttons */}
                <View style={styles.duplicateButtons}>
                  <TouchableOpacity
                    style={[styles.duplicateButton, { backgroundColor: colors.background.tertiary }]}
                    onPress={() => handleCreateNewFolder(folderName.trim())}
                  >
                    <Icon name="add-circle-outline" size={fp(18)} color={colors.text.secondary} />
                    <Text style={[styles.duplicateButtonText, { color: colors.text.secondary }]}>Create New</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.duplicateButton, { backgroundColor: colors.accent.primary }]}
                    onPress={handleAddToExistingFolder}
                  >
                    <Icon name="folder" size={fp(18)} color="#FFFFFF" />
                    <Text style={[styles.duplicateButtonText, { color: '#FFFFFF' }]}>Add to Existing</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.duplicateCancelButton}
                  onPress={() => {
                    setShowDuplicatePrompt(false);
                    setExistingFolder(null);
                  }}
                >
                  <Text style={[styles.duplicateCancelText, { color: colors.text.tertiary }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Folder Picker Modal */}
      <Modal
        visible={showFolderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowFolderPicker(false);
          setArticleToAddToFolder(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowFolderPicker(false);
              setArticleToAddToFolder(null);
            }}
          />
          <View style={[styles.folderModalContent, { backgroundColor: colors.background.secondary }]}>
            {/* Swipe indicator */}
            <View style={styles.modalSwipeIndicator}>
              <View style={[styles.swipeHandle, { backgroundColor: colors.text.tertiary }]} />
            </View>

            {/* Header */}
            <View style={styles.folderModalHeader}>
              <Icon name="folder-open" size={fp(28)} color="#8B5CF6" />
              <Text style={[styles.folderModalTitle, { color: colors.text.primary }]}>
                Add to Custom Stack
              </Text>
              <Text style={[styles.folderModalSubtitle, { color: colors.text.tertiary }]}>
                Select a folder or create a new one
              </Text>
            </View>

            {/* Existing Folders */}
            {folders.length > 0 && (
              <View style={styles.folderPickerList}>
                {folders.map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.folderPickerItem, { backgroundColor: colors.background.tertiary }]}
                    onPress={() => handleSelectFolder(folder)}
                  >
                    <Icon name="folder" size={fp(20)} color="#8B5CF6" />
                    <Text style={[styles.folderPickerItemText, { color: colors.text.primary }]}>
                      {folder.name}
                    </Text>
                    <Text style={[styles.folderPickerItemCount, { color: colors.text.tertiary }]}>
                      {folder.articleCount} articles
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Create New Folder */}
            <View style={[styles.folderInputContainer, { borderColor: '#8B5CF6' }]}>
              <TextInput
                style={[styles.folderInput, { color: colors.text.primary }]}
                placeholder="Create new folder..."
                placeholderTextColor={colors.text.tertiary}
                value={newFolderName}
                onChangeText={setNewFolderName}
                returnKeyType="done"
                onSubmitEditing={handleCreateNewFolderForArticle}
              />
              {newFolderName.trim() && (
                <TouchableOpacity
                  style={[styles.createFolderButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={handleCreateNewFolderForArticle}
                >
                  <Icon name="add" size={fp(18)} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.folderCancelButton, { backgroundColor: colors.background.tertiary }]}
              onPress={() => {
                setShowFolderPicker(false);
                setArticleToAddToFolder(null);
              }}
            >
              <Text style={[styles.folderCancelText, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Save All to Folder Modal */}
      <Modal
        visible={showSaveAllFolderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowSaveAllFolderPicker(false);
          setSaveAllFolderName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowSaveAllFolderPicker(false);
              setSaveAllFolderName('');
            }}
          />
          <View style={[styles.folderModalContent, { backgroundColor: colors.background.secondary }]}>
            {/* Swipe indicator */}
            <View style={styles.modalSwipeIndicator}>
              <View style={[styles.swipeHandle, { backgroundColor: colors.text.tertiary }]} />
            </View>

            {/* Header */}
            <View style={styles.folderModalHeader}>
              <Icon name="albums" size={fp(28)} color="#8B5CF6" />
              <Text style={[styles.folderModalTitle, { color: colors.text.primary }]}>
                Save Entire Stack
              </Text>
              <Text style={[styles.folderModalSubtitle, { color: colors.text.tertiary }]}>
                Save all {priorityArticles.length} articles to a folder
              </Text>
            </View>

            {/* Existing Folders */}
            {folders.length > 0 && (
              <View style={styles.folderPickerList}>
                {folders.map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.folderPickerItem, { backgroundColor: colors.background.tertiary }]}
                    onPress={() => handleSaveAllToExistingFolder(folder)}
                  >
                    <Icon name="folder" size={fp(20)} color="#8B5CF6" />
                    <Text style={[styles.folderPickerItemText, { color: colors.text.primary }]}>
                      {folder.name}
                    </Text>
                    <Text style={[styles.folderPickerItemCount, { color: colors.text.tertiary }]}>
                      {folder.articleCount} articles
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Create New Folder */}
            <View style={[styles.folderInputContainer, { borderColor: '#8B5CF6' }]}>
              <TextInput
                style={[styles.folderInput, { color: colors.text.primary }]}
                placeholder="Create new folder..."
                placeholderTextColor={colors.text.tertiary}
                value={saveAllFolderName}
                onChangeText={setSaveAllFolderName}
                returnKeyType="done"
                onSubmitEditing={handleCreateNewFolderForAll}
              />
              {saveAllFolderName.trim() && (
                <TouchableOpacity
                  style={[styles.createFolderButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={handleCreateNewFolderForAll}
                >
                  <Icon name="add" size={fp(18)} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.folderCancelButton, { backgroundColor: colors.background.tertiary }]}
              onPress={() => {
                setShowSaveAllFolderPicker(false);
                setSaveAllFolderName('');
              }}
            >
              <Text style={[styles.folderCancelText, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  countBadge: {
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
  countText: {
    color: 'white',
    fontSize: fp(14),
    fontWeight: '600',
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
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(24),
    marginTop: hp(-60),
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
  backToMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(12),
    paddingHorizontal: wp(20),
    borderRadius: ms(16),
    gap: wp(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  backToMainText: {
    color: 'white',
    fontSize: fp(14),
    fontWeight: '600',
  },
  instructionsBox: {
    marginHorizontal: wp(20),
    marginBottom: hp(12),
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
    paddingVertical: hp(4),
    flexWrap: 'nowrap',
  },
  instructionIconBox: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(6),
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  instructionEmojiBox: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(6),
    flexShrink: 0,
  },
  instructionText: {
    fontSize: fp(13),
    flexShrink: 1,
  },
  instructionBold: {
    fontWeight: '600',
  },
  navBarWrapper: {
    paddingHorizontal: wp(20),
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
  gridActionBtn: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
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
  sourceBadgeTextWhite: {
    fontSize: fp(11),
    fontWeight: '500',
    textTransform: 'capitalize',
    color: '#FFFFFF',
  },
  gridTitle: {
    fontSize: fp(12),
    fontWeight: '700',
    lineHeight: hp(17),
    marginBottom: hp(4),
  },
  gridDescription: {
    fontSize: fp(12),
    lineHeight: fp(18),
    marginBottom: hp(6),
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
  // Folder button in header
  folderButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderButtonText: {
    fontSize: fp(14),
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  folderModalContent: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingHorizontal: wp(20),
    paddingBottom: hp(40),
    maxHeight: '70%',
  },
  modalSwipeIndicator: {
    alignItems: 'center',
    paddingVertical: hp(12),
  },
  swipeHandle: {
    width: wp(40),
    height: hp(4),
    borderRadius: ms(2),
  },
  folderModalHeader: {
    alignItems: 'center',
    marginBottom: hp(24),
  },
  folderModalTitle: {
    fontSize: fp(20),
    fontWeight: '700',
    marginTop: hp(12),
  },
  folderModalSubtitle: {
    fontSize: fp(14),
    marginTop: hp(4),
  },
  folderInputContainer: {
    borderWidth: 2,
    borderRadius: ms(16),
    marginBottom: hp(20),
  },
  folderInput: {
    fontSize: fp(16),
    paddingHorizontal: wp(16),
    paddingVertical: hp(14),
  },
  folderModalButtons: {
    flexDirection: 'row',
    gap: wp(12),
  },
  folderCancelButton: {
    flex: 1,
    paddingVertical: hp(14),
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderCancelText: {
    fontSize: fp(15),
    fontWeight: '600',
  },
  folderSaveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: hp(14),
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(8),
  },
  folderSaveText: {
    fontSize: fp(15),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Duplicate folder prompt styles
  duplicatePromptContainer: {
    alignItems: 'center',
    marginBottom: hp(24),
  },
  duplicatePromptText: {
    fontSize: fp(16),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: hp(12),
  },
  duplicatePromptSubtext: {
    fontSize: fp(14),
    textAlign: 'center',
    marginTop: hp(8),
    lineHeight: fp(20),
  },
  duplicateButtons: {
    flexDirection: 'row',
    gap: wp(12),
    marginBottom: hp(16),
  },
  duplicateButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: hp(14),
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(8),
  },
  duplicateButtonText: {
    fontSize: fp(14),
    fontWeight: '600',
  },
  duplicateCancelButton: {
    alignItems: 'center',
    paddingVertical: hp(12),
  },
  duplicateCancelText: {
    fontSize: fp(14),
    fontWeight: '500',
  },
  // Folder Picker styles
  folderPickerList: {
    marginBottom: hp(16),
    maxHeight: hp(200),
  },
  folderPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(12),
    paddingHorizontal: wp(14),
    borderRadius: ms(12),
    marginBottom: hp(8),
    gap: wp(10),
  },
  folderPickerItemText: {
    flex: 1,
    fontSize: fp(15),
    fontWeight: '600',
  },
  folderPickerItemCount: {
    fontSize: fp(12),
  },
  createFolderButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: wp(8),
    top: hp(7),
  },
});
