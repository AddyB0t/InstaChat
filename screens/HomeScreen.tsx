/**
 * Home Screen
 * Displays received shared URL and allows saving articles
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  NativeModules,
  NativeEventEmitter,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { extractAndCreateArticle } from '../services/articleExtractor';
import { saveArticle, getArticleCount } from '../services/database';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

const { SharedIntentModule } = NativeModules;

export default function HomeScreen({ navigation }: any) {
  const { getColors, getFontSize, settings } = useTheme();
  const currentColors = getColors();
  const fontSizeStyle = (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl') => ({ fontSize: getFontSize(size), fontFamily: settings.fontFamily === 'serif' ? 'serif' : 'sans-serif' });
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [articleCount, setArticleCount] = useState(0);
  const eventEmitterSubscription = useRef<any>(null);

  // Set up listener for share intents
  useEffect(() => {
    if (SharedIntentModule) {
      try {
        const eventEmitter = new NativeEventEmitter(SharedIntentModule);

        const subscription = eventEmitter.addListener(
          'onShareIntent',
          (data: any) => {
            console.log('[HomeScreen] Share intent received:', data);
            if (data && data.url) {
              setSharedUrl(data.url);
              setIsSaved(false);
            }
          }
        );

        eventEmitterSubscription.current = subscription;
      } catch (error) {
        console.log('[HomeScreen] Error setting up share intent listener:', error);
      }
    }

    return () => {
      if (eventEmitterSubscription.current) {
        try {
          eventEmitterSubscription.current.remove();
        } catch (e) {
          console.log('[HomeScreen] Error removing listener:', e);
        }
      }
    };
  }, []);

  // Load article count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadArticleCount();
    }, [])
  );

  const loadArticleCount = async () => {
    try {
      const count = await getArticleCount();
      setArticleCount(count);
    } catch (error) {
      console.error('[HomeScreen] Error loading article count:', error);
    }
  };

  const handleSaveArticle = async () => {
    if (!sharedUrl) {
      Alert.alert('Error', 'No URL to save');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[HomeScreen] Extracting and saving article from:', sharedUrl);

      const article = await extractAndCreateArticle(sharedUrl);
      await saveArticle(article);

      console.log('[HomeScreen] Article saved successfully:', article.id);

      setIsSaved(true);
      loadArticleCount();

      Alert.alert('Success', 'Article saved successfully!', [
        {
          text: 'View Articles',
          onPress: () => navigation.navigate('Articles'),
        },
        { text: 'OK' },
      ]);
    } catch (error) {
      console.error('[HomeScreen] Error saving article:', error);
      Alert.alert(
        'Error',
        `Failed to save article: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearUrl = () => {
    setSharedUrl(null);
    setIsSaved(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentColors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { borderBottomColor: currentColors.primary }]}>
        <Text style={styles.headerEmoji}>↗️</Text>
        <Text style={[styles.title, { color: currentColors.text }]}>InstaChat</Text>
        <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>Share articles to read later</Text>
      </View>

      {sharedUrl ? (
        <View style={[styles.section, { backgroundColor: currentColors.surfaceLight, borderColor: currentColors.border }]}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Received URL:</Text>
          <View style={[styles.urlBox, { backgroundColor: currentColors.surface, borderLeftColor: currentColors.primary }]}>
            <Text style={[styles.urlText, { color: currentColors.primaryLight }]} numberOfLines={3}>
              {sharedUrl}
            </Text>
          </View>

          {!isSaved && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: currentColors.primary }, isLoading && styles.buttonDisabled]}
              onPress={handleSaveArticle}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="white" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Extracting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.buttonEmoji}>💾</Text>
                  <Text style={styles.buttonText}>Save Article</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isSaved && (
            <View style={[styles.savedBox, { backgroundColor: currentColors.surface, borderLeftColor: currentColors.success }]}>
              <Text style={styles.savedEmoji}>✓</Text>
              <Text style={[styles.savedText, { color: currentColors.success }]}>Article saved successfully!</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.buttonSecondary, { borderColor: currentColors.primary }]} onPress={handleClearUrl}>
            <Text style={styles.buttonEmoji}>✕</Text>
            <Text style={[styles.buttonSecondaryText, { color: currentColors.primary }]}>Clear URL</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.section, { backgroundColor: currentColors.surfaceLight, borderColor: currentColors.border }]}>
          <Text style={styles.emptyEmoji}>📥</Text>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Ready to receive shares</Text>
          <Text style={[styles.instructionText, { color: currentColors.textSecondary }]}>
            Share a URL from Chrome, Safari, or any other app to save it here for reading later.
          </Text>
        </View>
      )}

      <View style={styles.statsSection}>
        <View style={[styles.statCard, { backgroundColor: currentColors.surfaceLight, borderColor: currentColors.border }]}>
          <Text style={styles.statEmoji}>📚</Text>
          <Text style={[styles.statNumber, { color: currentColors.primary }]}>{articleCount}</Text>
          <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>Articles Saved</Text>
        </View>
      </View>

      <View style={[styles.infoSection, { backgroundColor: currentColors.surface, borderLeftColor: currentColors.warning }]}>
        <Text style={[styles.infoTitle, { color: currentColors.text }]}>How it works:</Text>
        <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>1. Share a URL from any app</Text>
        <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>2. InstaChat extracts the article content</Text>
        <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>3. Your article is saved for reading later</Text>
        <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>4. Access your collection anytime</Text>
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
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.dark.primary,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing.md,
  },
  urlBox: {
    padding: spacing.md,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.dark.primary,
    marginBottom: spacing.lg,
  },
  urlText: {
    fontSize: fontSize.sm,
    color: colors.dark.primaryLight,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.dark.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: spacing.md,
  },
  buttonEmoji: {
    fontSize: fontSize.lg,
    marginRight: spacing.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  buttonSecondary: {
    borderWidth: 2,
    borderColor: colors.dark.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: colors.dark.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  savedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.dark.success,
  },
  savedEmoji: {
    fontSize: fontSize.lg,
    marginRight: spacing.md,
  },
  savedText: {
    fontSize: fontSize.sm,
    color: colors.dark.success,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
    opacity: 0.5,
  },
  instructionText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  statsSection: {
    marginBottom: spacing.xxl,
  },
  statCard: {
    backgroundColor: colors.dark.surfaceLight,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  statNumber: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.dark.primary,
    marginTop: spacing.md,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing.sm,
  },
  infoSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.dark.warning,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
});
