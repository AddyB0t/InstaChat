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

const { SharedIntentModule } = NativeModules;

export default function HomeScreen({ navigation }: any) {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>↗️</Text>
        <Text style={styles.title}>InstaChat</Text>
        <Text style={styles.subtitle}>Share articles to read later</Text>
      </View>

      {sharedUrl ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Received URL:</Text>
          <View style={styles.urlBox}>
            <Text style={styles.urlText} numberOfLines={3}>
              {sharedUrl}
            </Text>
          </View>

          {!isSaved && (
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
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
            <View style={styles.savedBox}>
              <Text style={styles.savedEmoji}>✓</Text>
              <Text style={styles.savedText}>Article saved successfully!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.buttonSecondary} onPress={handleClearUrl}>
            <Text style={styles.buttonEmoji}>✕</Text>
            <Text style={styles.buttonSecondaryText}>Clear URL</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.emptyEmoji}>📥</Text>
          <Text style={styles.sectionTitle}>Ready to receive shares</Text>
          <Text style={styles.instructionText}>
            Share a URL from Chrome, Safari, or any other app to save it here for reading later.
          </Text>
        </View>
      )}

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📚</Text>
          <Text style={styles.statNumber}>{articleCount}</Text>
          <Text style={styles.statLabel}>Articles Saved</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <Text style={styles.infoText}>1. Share a URL from any app</Text>
        <Text style={styles.infoText}>2. InstaChat extracts the article content</Text>
        <Text style={styles.infoText}>3. Your article is saved for reading later</Text>
        <Text style={styles.infoText}>4. Access your collection anytime</Text>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2196f3',
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  urlBox: {
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    marginBottom: 16,
  },
  urlText: {
    fontSize: 13,
    color: '#1976d2',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#2196f3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: '#2196f3',
    fontSize: 14,
    fontWeight: '600',
  },
  savedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    marginBottom: 12,
  },
  savedEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  savedText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 12,
  },
  statsSection: {
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196f3',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 16,
    marginBottom: 6,
    lineHeight: 18,
  },
});
