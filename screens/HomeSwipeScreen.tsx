/**
 * HomeSwipeScreen
 * Main swipe interface for browsing articles with Tinder-style cards
 * Momentum-style aesthetic with minimal UI and smooth animations
 */

import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Alert,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { Article, getAllArticles, updateArticle } from '../services/database';
import { SwipeCardNew } from '../components/SwipeCardNew';
import { BundleIcon } from '../components/BundleIcon';
import { ThemeContext } from '../context/ThemeContext';
import {
  addArticleToBundle,
  getBundleArticleCount,
  getCurrentBundle,
} from '../services/bundleService';

interface HomeSwipeScreenProps {
  navigation: any;
}

export const HomeSwipeScreen: React.FC<HomeSwipeScreenProps> = ({ navigation }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bundleCount, setBundleCount] = useState(0);
  const [bundleMode, setBundleMode] = useState(false);
  const [bundleArticleIds, setBundleArticleIds] = useState<string[]>([]);

  const systemColorScheme = useColorScheme();
  const { settings } = useContext(ThemeContext);

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  // Get current date for Momentum-style header
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // Load articles
  const loadArticles = async () => {
    try {
      setLoading(true);
      const allArticles = await getAllArticles();

      // Filter unread articles or all articles
      const unreadArticles = allArticles.filter(a => a.isUnread !== false);

      setArticles(unreadArticles);
      setCurrentIndex(0);

      // Load bundle count
      const count = await getBundleArticleCount();
      setBundleCount(count);

      // Get bundle article IDs if in bundle mode
      const bundle = await getCurrentBundle();
      if (bundle) {
        setBundleArticleIds(bundle.articleIds);
      }
    } catch (error) {
      console.error('[HomeSwipeScreen] Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [])
  );

  useEffect(() => {
    if (bundleMode) {
      // Filter articles to only show those in bundle
      loadBundleArticles();
    } else {
      loadArticles();
    }
  }, [bundleMode]);

  const loadBundleArticles = async () => {
    try {
      const bundle = await getCurrentBundle();
      if (!bundle || bundle.articleIds.length === 0) {
        setBundleMode(false);
        return;
      }

      const allArticles = await getAllArticles();
      const bundleArticles = allArticles.filter(a =>
        bundle.articleIds.includes(a.id)
      );

      setArticles(bundleArticles);
      setCurrentIndex(0);
      setBundleArticleIds(bundle.articleIds);
    } catch (error) {
      console.error('[HomeSwipeScreen] Error loading bundle articles:', error);
    }
  };

  // Handle left swipe (skip)
  const handleSwipeLeft = async (article: Article) => {
    console.log('[HomeSwipeScreen] Swiped left (skip):', article.title);
    setCurrentIndex(prev => prev + 1);
  };

  // Handle right swipe (open & mark as read)
  const handleSwipeRight = async (article: Article) => {
    console.log('[HomeSwipeScreen] Swiped right (open):', article.title);

    try {
      // Mark as read
      await updateArticle(article.id, { isUnread: false });

      // Open URL
      const canOpen = await Linking.canOpenURL(article.url);
      if (canOpen) {
        await Linking.openURL(article.url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }

      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('[HomeSwipeScreen] Error opening article:', error);
      Alert.alert('Error', 'Failed to open article');
    }
  };

  // Handle up swipe (add to bundle)
  const handleSwipeUp = async (article: Article) => {
    console.log('[HomeSwipeScreen] Swiped up (bundle):', article.title);

    try {
      const bundle = await addArticleToBundle(article.id);
      setBundleCount(bundle.articleIds.length);
      setCurrentIndex(prev => prev + 1);

      // Show feedback
      // Could add a toast notification here
    } catch (error) {
      console.error('[HomeSwipeScreen] Error adding to bundle:', error);
      Alert.alert('Error', 'Failed to add to bundle');
    }
  };

  // Handle card press (view details)
  const handleCardPress = (article: Article) => {
    console.log('[HomeSwipeScreen] Card pressed:', article.title);
    navigation.navigate('ArticleDetail', { articleId: article.id });
  };

  // Handle bundle icon press
  const handleBundlePress = () => {
    if (bundleCount > 0) {
      setBundleMode(true);
    }
  };

  // Handle bundle exit
  const handleBundleExit = () => {
    setBundleMode(false);
    loadArticles();
  };

  // Get current and next article
  const currentArticle = articles[currentIndex];
  const nextArticle = articles[currentIndex + 1];

  // Check if we're out of articles
  if (loading) {
    return (
      <LinearGradient
        colors={isDark ? ['#1A1A1A', '#0F0F0F'] : ['#FFE5F0', '#E5F0FF', '#FFF5E5']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <View style={styles.centered}>
            <Text style={[styles.message, isDark && styles.messageDark]}>Loading articles...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!currentArticle) {
    return (
      <LinearGradient
        colors={isDark ? ['#1A1A1A', '#0F0F0F'] : ['#FFE5F0', '#E5F0FF', '#FFF5E5']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
              {bundleMode ? 'Bundle Complete!' : "You're all caught up!"}
            </Text>
            <Text style={[styles.emptySubtitle, isDark && styles.emptySubtitleDark]}>
              {bundleMode
                ? "You've reviewed all articles in this bundle."
                : 'No more articles to read right now.'}
            </Text>
            {bundleMode && (
              <Text
                style={styles.exitBundleButton}
                onPress={handleBundleExit}
              >
                Exit Bundle Mode
              </Text>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={isDark ? ['#1A1A1A', '#0F0F0F'] : ['#FFE5F0', '#E5F0FF', '#FFF5E5']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Momentum-style Header */}
        <View style={styles.momentumHeader}>
          <Text style={[styles.dateText, isDark && styles.dateTextDark]}>{dayName}</Text>
          <Text style={[styles.titleText, isDark && styles.titleTextDark]}>Your Reading Stack</Text>
          <Text style={[styles.subtitleText, isDark && styles.subtitleTextDark]}>
            {currentIndex + 1} of {articles.length} articles
          </Text>
        </View>

        {/* Bundle Icon */}
        {!bundleMode && (
          <BundleIcon
            count={bundleCount}
            onPress={handleBundlePress}
            visible={bundleCount > 0}
          />
        )}

        {/* Bundle Mode Indicator */}
        {bundleMode && (
          <View style={[styles.bundleHeader, isDark && styles.bundleHeaderDark]}>
            <Text style={styles.bundleTitle}>📦 Bundle Mode</Text>
            <Text style={styles.bundleExit} onPress={handleBundleExit}>
              Exit
            </Text>
          </View>
        )}

        {/* Card Stack */}
        <View style={styles.cardContainer}>
          {/* Next card (behind) */}
          {nextArticle && (
            <SwipeCardNew
              article={nextArticle}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
              onPress={handleCardPress}
              index={currentIndex + 1}
              isTop={false}
            />
          )}

          {/* Current card (on top) */}
          <SwipeCardNew
            article={currentArticle}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onSwipeUp={handleSwipeUp}
            onPress={handleCardPress}
            index={currentIndex}
            isTop={true}
          />
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={[styles.instructionText, isDark && styles.instructionTextDark]}>
            ← Skip • Open → • ↑ Bundle
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
  messageDark: {
    color: '#9CA3AF',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTitleDark: {
    color: '#F9FAFB',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySubtitleDark: {
    color: '#9CA3AF',
  },
  exitBundleButton: {
    marginTop: 20,
    fontSize: 16,
    color: '#4A9FFF',
    fontWeight: '600',
  },
  momentumHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  dateTextDark: {
    color: '#6B7280',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  titleTextDark: {
    color: '#F9FAFB',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  subtitleTextDark: {
    color: '#9CA3AF',
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(74, 159, 255, 0.9)',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  bundleHeaderDark: {
    backgroundColor: 'rgba(74, 159, 255, 0.7)',
  },
  bundleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bundleExit: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  instructions: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingBottom: 32,
  },
  instructionText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  instructionTextDark: {
    color: '#6B7280',
  },
});
