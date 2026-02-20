/**
 * NotiF App with Share Intent Support
 * Handles shared URLs from other apps
 */

import React, { useEffect, useRef, createContext, useState, useContext } from 'react';
import { StatusBar, NativeModules, Alert, ToastAndroid, View, ActivityIndicator, Modal, Text, StyleSheet, Animated, DeviceEventEmitter, AppState, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootNavigator } from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { extractAndCreateArticle, enhanceArticleInBackground } from './services/articleExtractor';
import { saveArticle, updateArticle } from './services/database';
import { canSaveArticle } from './services/subscriptionService';
import OnboardingScreen from './screens/OnboardingScreen';
import PremiumModal from './components/PremiumModal';

const ONBOARDING_KEY = '@instachat_onboarding_complete';
const APP_VERSION_KEY = '@instachat_app_version';
const CURRENT_APP_VERSION = '1.0.6'; // Increment this with each release

const { SharedIntentModule } = NativeModules;

// Create a context for shared URL
interface ShareContextType {
  sharedUrl: string | null;
  setSharedUrl: (url: string | null) => void;
}

export const ShareContext = createContext<ShareContextType>({
  sharedUrl: null,
  setSharedUrl: () => {},
});

export const useShare = () => useContext(ShareContext);

// Extract article URL from deep link (notif://share?url=...)
function extractUrlFromDeepLink(deepLink: string): string | null {
  try {
    if (deepLink.startsWith('notif://share')) {
      const match = deepLink.match(/[?&]url=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
  } catch (error) {
    console.log('[App] Error parsing deep link:', error);
  }
  return null;
}

function AppContent() {
  const { getColors, getThemedColors, settings } = useTheme();
  const { isPremium, isLoading: isSubscriptionLoading } = useSubscription();
  const currentColors = getColors();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumArticleCount, setPremiumArticleCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const mainFadeAnim = useRef(new Animated.Value(0)).current;
  const navigationRef = useRef<any>(null);

  // Track URLs being processed to prevent duplicates from race conditions
  const processingUrlsRef = useRef<Set<string>>(new Set());
  const recentlyProcessedRef = useRef<Map<string, number>>(new Map());

  // Track subscription loading state in ref for async access
  const subscriptionLoadingRef = useRef(isSubscriptionLoading);
  const isPremiumRef = useRef(isPremium);

  // Keep refs in sync with state
  useEffect(() => {
    subscriptionLoadingRef.current = isSubscriptionLoading;
    isPremiumRef.current = isPremium;
  }, [isSubscriptionLoading, isPremium]);

  // Check for app update and clear caches if needed
  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const storedVersion = await AsyncStorage.getItem(APP_VERSION_KEY);
        if (storedVersion !== CURRENT_APP_VERSION) {
          console.log(`[App] App updated from ${storedVersion || 'unknown'} to ${CURRENT_APP_VERSION}, clearing caches...`);
          // Don't clear everything - preserve user data like onboarding status
          // Just update the version marker
          await AsyncStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
          console.log('[App] Version marker updated');
        }
      } catch (error) {
        console.log('[App] Error checking app version:', error);
      }
    };
    checkAppVersion();
  }, []);

  // Check if onboarding has been completed
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
        setShowOnboarding(completed !== 'true');
      } catch (error) {
        console.log('[App] Error checking onboarding:', error);
        setShowOnboarding(false);
      }
    };
    checkOnboarding();
  }, []);

  // Handle onboarding completion with smooth transition
  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setIsTransitioning(true);

      // Fade out onboarding, then fade in main app
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowOnboarding(false);
        // Fade in main app
        Animated.timing(mainFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setIsTransitioning(false);
        });
      });
    } catch (error) {
      console.log('[App] Error saving onboarding state:', error);
      setShowOnboarding(false);
    }
  };

  // Set mainFadeAnim to 1 if not showing onboarding on initial load
  useEffect(() => {
    if (showOnboarding === false && !isTransitioning) {
      mainFadeAnim.setValue(1);
    }
  }, [showOnboarding]);

  // Shared function to handle saving article from URL
  const handleSharedUrl = async (url: string) => {
    // Normalize URL for comparison
    const normalizedUrl = url.trim().toLowerCase();

    // Check if this URL is currently being processed (prevents race condition)
    if (processingUrlsRef.current.has(normalizedUrl)) {
      console.log('[App] URL already being processed, skipping:', url);
      return;
    }

    // Check if this URL was recently processed (within 5 seconds)
    const lastProcessed = recentlyProcessedRef.current.get(normalizedUrl);
    if (lastProcessed && Date.now() - lastProcessed < 5000) {
      console.log('[App] URL was recently processed, skipping:', url);
      return;
    }

    // Mark as processing
    processingUrlsRef.current.add(normalizedUrl);

    console.log('[App] Auto-saving shared article:', url);

    // Wait for subscription status to load before checking (max 3 seconds)
    let waitTime = 0;
    while (subscriptionLoadingRef.current && waitTime < 3000) {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
      waitTime += 100;
    }

    // Check subscription before saving (use ref for current value)
    const { articleCount, requiresPremium } = await canSaveArticle(isPremiumRef.current);
    if (requiresPremium) {
      console.log('[App] Article limit reached, showing premium modal');
      setPremiumArticleCount(articleCount);
      setShowPremiumModal(true);
      processingUrlsRef.current.delete(normalizedUrl);
      return;
    }

    setIsSaving(true);
    try {
      // Extract article (FAST - no AI)
      const article = await extractAndCreateArticle(url);

      // Save immediately
      await saveArticle(article);
      console.log('[App] Article saved instantly:', article.id);

      // Mark as recently processed
      recentlyProcessedRef.current.set(normalizedUrl, Date.now());

      // Show toast and navigate immediately
      ToastAndroid.show('Article saved!', ToastAndroid.SHORT);
      setIsSaving(false);

      // Emit event to refresh Home screen
      DeviceEventEmitter.emit('refreshArticles');

      if (navigationRef.current) {
        navigationRef.current.navigate('Main', { screen: 'Home' });
      }

      // Run AI enhancement in background (non-blocking)
      enhanceArticleInBackground(article).then(async (updates) => {
        if (updates) {
          try {
            await updateArticle(article.id, updates);
            console.log('[App] Article AI-enhanced in background:', article.id);
            ToastAndroid.show('AI tags added!', ToastAndroid.SHORT);
          } catch (updateError) {
            console.log('[App] Failed to update with AI data:', updateError);
          }
        }
      }).catch((err) => {
        console.log('[App] Background AI enhancement error:', err);
      });

    } catch (error) {
      console.error('[App] Error auto-saving shared article:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setIsSaving(false);

      // Handle duplicate gracefully - just show toast and navigate
      if (errorMessage.includes('already saved')) {
        // Also mark as recently processed for duplicates
        recentlyProcessedRef.current.set(normalizedUrl, Date.now());
        ToastAndroid.show('Already in your library!', ToastAndroid.SHORT);
        DeviceEventEmitter.emit('refreshArticles');
        if (navigationRef.current) {
          navigationRef.current.navigate('Main', { screen: 'Home' });
        }
      } else {
        Alert.alert('Error', `Failed to save article: ${errorMessage}`);
      }
    } finally {
      // Always remove from processing set when done
      processingUrlsRef.current.delete(normalizedUrl);
    }
  };

  // Check for pending share URLs on startup (cold start case) - supports queue
  useEffect(() => {
    if (SharedIntentModule) {
      const checkPending = async () => {
        try {
          // First try to get all queued URLs
          const pendingUrls = await SharedIntentModule.checkPendingShareQueue?.();
          if (pendingUrls && Array.isArray(pendingUrls) && pendingUrls.length > 0) {
            console.log(`[App] Found ${pendingUrls.length} pending share URLs from queue:`, pendingUrls);
            // Process each URL sequentially
            for (const url of pendingUrls) {
              await handleSharedUrl(url);
            }
            return;
          }

          // Fallback to single URL check for backward compatibility
          const pendingUrl = await SharedIntentModule.checkPendingShareUrl();
          if (pendingUrl) {
            console.log('[App] Found pending share URL from cold start:', pendingUrl);
            handleSharedUrl(pendingUrl);
          }
        } catch (error) {
          console.log('[App] Error checking pending share URLs:', error);
        }
      };
      // Small delay to ensure app is fully mounted
      setTimeout(checkPending, 500);
    }
  }, []);

  // Handle shared URLs via React Native's Linking API (primary path for iOS)
  useEffect(() => {
    // Cold start: check if app was launched from a URL scheme
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[App] Initial URL from Linking:', url);
        const articleUrl = extractUrlFromDeepLink(url);
        if (articleUrl) {
          handleSharedUrl(articleUrl);
        }
      }
    }).catch((err) => {
      console.log('[App] Error getting initial URL:', err);
    });

    // Warm start: listen for URL events from RCTOpenURLNotification
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[App] URL event from Linking:', event.url);
      const articleUrl = extractUrlFromDeepLink(event.url);
      if (articleUrl) {
        handleSharedUrl(articleUrl);
      }
    });

    return () => subscription.remove();
  }, []);

  // Fallback: poll for pending URLs when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && SharedIntentModule) {
        setTimeout(async () => {
          try {
            const pendingUrl = await SharedIntentModule.checkPendingShareUrl();
            if (pendingUrl) {
              console.log('[App] Found pending share URL on foreground:', pendingUrl);
              handleSharedUrl(pendingUrl).catch(err =>
                console.log('[App] Error handling foreground share URL:', err)
              );
            }
          } catch (error) {
            console.log('[App] Error checking pending share URLs on foreground:', error);
          }
        }, 500);
      }
    });
    return () => subscription.remove();
  }, []);

  // Show loading while checking onboarding status
  if (showOnboarding === null) {
    return (
      <SafeAreaProvider>
        <View style={[styles.loadingContainer, { backgroundColor: '#000000' }]}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </SafeAreaProvider>
    );
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </Animated.View>
      </SafeAreaProvider>
    );
  }

  return (
    <ShareContext.Provider value={{ sharedUrl, setSharedUrl }}>
      <SafeAreaProvider>
        <Animated.View style={{ flex: 1, opacity: mainFadeAnim }}>
          <StatusBar
            barStyle={currentColors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
            backgroundColor={currentColors.background}
          />
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </Animated.View>

        {/* Loading overlay for auto-save */}
        <Modal
          visible={isSaving}
          transparent={true}
          animationType="fade"
        >
          <View style={[styles.loadingContainer, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
            <View style={[styles.loadingBox, { backgroundColor: currentColors.surface, borderColor: currentColors.primary }]}>
              <ActivityIndicator size="large" color={currentColors.primary} style={styles.spinner} />
              <Text style={[styles.loadingText, { color: currentColors.text }]}>Saving article...</Text>
              <Text style={[styles.loadingSubtext, { color: currentColors.textSecondary }]}>Extracting content and generating summary</Text>
            </View>
          </View>
        </Modal>

        {/* Premium upgrade modal */}
        <PremiumModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          colors={getThemedColors(settings.theme === 'dark')}
          articleCount={premiumArticleCount}
        />
      </SafeAreaProvider>
    </ShareContext.Provider>
  );
}

// Wrapper to connect theme to GlueStack
function GluestackWrapper() {
  const { settings } = useTheme();

  // Map theme setting to GlueStack colorMode
  const colorMode = settings.theme === 'auto'
    ? 'system'
    : settings.theme;

  return (
    <GluestackUIProvider config={config} colorMode={colorMode}>
      <AppContent />
    </GluestackUIProvider>
  );
}

function App() {
  return (
    <SubscriptionProvider>
      <ThemeProvider>
        <GluestackWrapper />
      </ThemeProvider>
    </SubscriptionProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingBox: {
    paddingHorizontal: 40,
    paddingVertical: 50,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
});

export default App;
