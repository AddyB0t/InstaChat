/**
 * NotiF App with Share Intent Support
 * Handles shared URLs from other apps
 */

import React, { useEffect, useRef, createContext, useState, useContext, useCallback } from 'react';
import { StatusBar, NativeModules, Alert, View, ActivityIndicator, Modal, Text, StyleSheet, Animated, AppState, Linking, useColorScheme, DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';
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
import ErrorBoundary from './components/ErrorBoundary';
import FeedbackToast from './components/FeedbackToast';
import { showTransientMessage } from './services/feedback';
import { importNativeShareDebugEvents, logError, logInfo, logWarn } from './services/logger';
import { emitArticlesChanged } from './services/articleEvents';
import { describeArticleUrl, normalizeArticleUrl } from './services/urlUtils';

const ONBOARDING_KEY = '@instachat_onboarding_complete';
const APP_VERSION_KEY = '@instachat_app_version';
const CURRENT_APP_VERSION = '3.0'; // Increment this with each release

type SharedIntentModuleType = {
  checkPendingShareUrl?: () => Promise<string | null>;
  checkPendingShareQueue?: () => Promise<string[]>;
  flushNativeShareDebugEvents?: () => Promise<string[]>;
  addListener?: (eventName: string) => void;
  removeListeners?: (count: number) => void;
};

const { SharedIntentModule } = NativeModules as {
  SharedIntentModule?: SharedIntentModuleType;
};

type PendingSharedUrl = {
  id: string;
  url: string;
  originalUrl: string;
  source: string;
  queuedAt: number;
};

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
      const urlParamIndex = deepLink.indexOf('url=');
      if (urlParamIndex >= 0) {
        return decodeURIComponent(deepLink.slice(urlParamIndex + 4));
      }
    }
  } catch (error) {
    try {
      const match = deepLink.match(/[?&]url=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    } catch (fallbackError) {
      console.log('[App] Error parsing deep link:', fallbackError);
    }
    console.log('[App] Error parsing deep link:', error);
  }
  return null;
}

function StartupSplash() {
  return (
    <SafeAreaProvider>
      <StartupSplashContent />
    </SafeAreaProvider>
  );
}

function StartupSplashContent() {
  return (
    <View style={styles.startupContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.startupBrand}>
        <Text style={styles.startupTitle}>NotiF</Text>
        <Text style={styles.startupSubtitle}>BOOKMARK</Text>
      </View>
      <ActivityIndicator size="large" color="#F97316" style={styles.startupSpinner} />
    </View>
  );
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
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [navigationResetKey, setNavigationResetKey] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const mainFadeAnim = useRef(new Animated.Value(1)).current;
  const navigationRef = useRef<any>(null);

  // Track URLs being processed to prevent duplicates from race conditions
  const processingUrlsRef = useRef<Set<string>>(new Set());
  const recentlyProcessedRef = useRef<Map<string, number>>(new Map());
  const pendingSharedUrlsRef = useRef<PendingSharedUrl[]>([]);
  const shareHandlingReadyRef = useRef(false);
  const flushingPendingSharesRef = useRef(false);
  const shareSequenceRef = useRef(0);
  const appStartAtRef = useRef(Date.now());
  const navigationRetryCountRef = useRef(0);
  const showOnboardingRef = useRef<boolean | null>(showOnboarding);
  const isNavigationReadyRef = useRef(isNavigationReady);
  const isTransitioningRef = useRef(isTransitioning);

  // Track subscription loading state in ref for async access
  const subscriptionLoadingRef = useRef(isSubscriptionLoading);
  const isPremiumRef = useRef(isPremium);

  // Keep refs in sync with state
  useEffect(() => {
    subscriptionLoadingRef.current = isSubscriptionLoading;
    isPremiumRef.current = isPremium;
  }, [isSubscriptionLoading, isPremium]);

  useEffect(() => {
    showOnboardingRef.current = showOnboarding;
    isNavigationReadyRef.current = isNavigationReady;
    isTransitioningRef.current = isTransitioning;
  }, [showOnboarding, isNavigationReady, isTransitioning]);

  useEffect(() => {
    logInfo('App', 'AppContent mounted', {
      hasSharedIntentModule: Boolean(SharedIntentModule),
      isSubscriptionLoading,
    });
  }, [isSubscriptionLoading]);

  useEffect(() => {
    importNativeShareDebugEvents('appContentMount').catch(error => {
      logWarn('NativeShare', 'Failed to import native share events on mount', { error });
    });
  }, []);

  useEffect(() => {
    logInfo('AppStartup', 'Startup state changed', {
      elapsedMs: Date.now() - appStartAtRef.current,
      showOnboarding,
      isNavigationReady,
      isTransitioning,
      isSubscriptionLoading,
      appState: AppState.currentState,
    });
  }, [showOnboarding, isNavigationReady, isTransitioning, isSubscriptionLoading]);

  useEffect(() => {
    const isTestRuntime = typeof (globalThis as { expect?: unknown }).expect === 'function';
    if (isTestRuntime) {
      return;
    }

    const checkpoints = [1000, 2000, 5000, 10000].map(delay => setTimeout(() => {
      const shouldRetryNavigation =
        delay >= 2000 &&
        showOnboardingRef.current === false &&
        !isNavigationReadyRef.current &&
        navigationRetryCountRef.current < 1;

      logInfo('AppStartup', 'Startup watchdog checkpoint', {
        elapsedMs: Date.now() - appStartAtRef.current,
        checkpointMs: delay,
        showOnboarding: showOnboardingRef.current,
        isNavigationReady: isNavigationReadyRef.current,
        isTransitioning: isTransitioningRef.current,
        isSubscriptionLoading: subscriptionLoadingRef.current,
        appState: AppState.currentState,
        willRetryNavigation: shouldRetryNavigation,
      });

      if (shouldRetryNavigation) {
        navigationRetryCountRef.current += 1;
        logWarn('AppStartup', 'Navigation did not become ready; remounting navigation tree', {
          elapsedMs: Date.now() - appStartAtRef.current,
          retryCount: navigationRetryCountRef.current,
        });
        setNavigationResetKey(current => current + 1);
      }
    }, delay));

    return () => checkpoints.forEach(clearTimeout);
  }, []);

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
        const shouldShowOnboarding = completed !== 'true';
        logInfo('App', 'Onboarding state loaded', { shouldShowOnboarding });
        setShowOnboarding(shouldShowOnboarding);
      } catch (error) {
        console.log('[App] Error checking onboarding:', error);
        logInfo('App', 'Onboarding state failed open', { error });
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
        mainFadeAnim.setValue(0);
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
  }, [showOnboarding, isTransitioning, mainFadeAnim]);

  const getShareReadinessSnapshot = useCallback(() => ({
    showOnboarding: showOnboardingRef.current,
    isNavigationReady: isNavigationReadyRef.current,
    isTransitioning: isTransitioningRef.current,
    isSubscriptionLoading: subscriptionLoadingRef.current,
    queueDepth: pendingSharedUrlsRef.current.length,
    appState: AppState.currentState,
  }), []);

  // Shared function to handle saving article from URL
  const handleSharedUrl = useCallback(async (share: PendingSharedUrl) => {
    const urlDetails = describeArticleUrl(share.url);
    const normalizedUrl = urlDetails.normalizedUrl.toLowerCase();
    const queuedMs = Date.now() - share.queuedAt;

    logInfo('SharePipeline', 'Begin processing shared URL', {
      shareId: share.id,
      source: share.source,
      queuedMs,
      url: urlDetails,
      readiness: getShareReadinessSnapshot(),
    });

    if (processingUrlsRef.current.has(normalizedUrl)) {
      logInfo('SharePipeline', 'Skipping shared URL already processing', {
        shareId: share.id,
        source: share.source,
        url: urlDetails,
      });
      return;
    }

    const lastProcessed = recentlyProcessedRef.current.get(normalizedUrl);
    if (lastProcessed && Date.now() - lastProcessed < 5000) {
      logInfo('SharePipeline', 'Skipping shared URL processed recently', {
        shareId: share.id,
        source: share.source,
        msSinceProcessed: Date.now() - lastProcessed,
        url: urlDetails,
      });
      return;
    }

    processingUrlsRef.current.add(normalizedUrl);

    logInfo('SharePipeline', 'Auto-saving shared article', {
      shareId: share.id,
      source: share.source,
      canonicalUrl: urlDetails.normalizedUrl,
    });

    // Wait for subscription status to load before checking (max 3 seconds)
    let waitTime = 0;
    while (subscriptionLoadingRef.current && waitTime < 3000) {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
      waitTime += 100;
    }

    logInfo('SharePipeline', 'Subscription wait completed', {
      shareId: share.id,
      waitTime,
      isSubscriptionLoading: subscriptionLoadingRef.current,
      isPremium: isPremiumRef.current,
    });

    // Check subscription before saving (use ref for current value)
    const { articleCount, requiresPremium } = await canSaveArticle(isPremiumRef.current);
    if (requiresPremium) {
      logWarn('SharePipeline', 'Article limit reached during shared save', {
        shareId: share.id,
        articleCount,
        isPremium: isPremiumRef.current,
      });
      setPremiumArticleCount(articleCount);
      setShowPremiumModal(true);
      processingUrlsRef.current.delete(normalizedUrl);
      return;
    }

    setIsSaving(true);
    try {
      // Extract article (FAST - no AI)
      logInfo('SharePipeline', 'Extracting shared article', {
        shareId: share.id,
        canonicalUrl: urlDetails.normalizedUrl,
      });
      const article = await extractAndCreateArticle(urlDetails.normalizedUrl);

      // Save immediately
      await saveArticle(article);
      logInfo('SharePipeline', 'Shared article saved', {
        shareId: share.id,
        articleId: article.id,
        titleLength: article.title?.length ?? 0,
        url: describeArticleUrl(article.url),
      });

      // Mark as recently processed
      recentlyProcessedRef.current.set(normalizedUrl, Date.now());

      // Show toast and navigate immediately
      showTransientMessage('Article saved!');
      setIsSaving(false);

      // Emit event to refresh Home screen
      emitArticlesChanged();

      if (navigationRef.current) {
        logInfo('SharePipeline', 'Navigating after shared save', {
          shareId: share.id,
          route: 'Main/Home',
        });
        navigationRef.current.navigate('Main', { screen: 'Home' });
      } else {
        logWarn('SharePipeline', 'Navigation ref missing after shared save', {
          shareId: share.id,
        });
      }

      // Run AI enhancement in background (non-blocking)
      enhanceArticleInBackground(article).then(async (updates) => {
        if (updates) {
          try {
            await updateArticle(article.id, updates);
            logInfo('SharePipeline', 'Shared article AI-enhanced in background', {
              shareId: share.id,
              articleId: article.id,
            });
            showTransientMessage('AI tags added!');
          } catch (updateError) {
            logWarn('SharePipeline', 'Failed to update shared article with AI data', {
              shareId: share.id,
              articleId: article.id,
              error: updateError,
            });
          }
        }
      }).catch((err) => {
        logWarn('SharePipeline', 'Background AI enhancement error for shared article', {
          shareId: share.id,
          articleId: article.id,
          error: err,
        });
      });

    } catch (error) {
      logError('SharePipeline', 'Error auto-saving shared article', {
        shareId: share.id,
        source: share.source,
        url: urlDetails,
        error,
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setIsSaving(false);

      // Handle duplicate gracefully - just show toast and navigate
      if (errorMessage.includes('already saved')) {
        // Also mark as recently processed for duplicates
        recentlyProcessedRef.current.set(normalizedUrl, Date.now());
        logInfo('SharePipeline', 'Shared article already existed', {
          shareId: share.id,
          source: share.source,
          url: urlDetails,
        });
        showTransientMessage('Already in your library!');
        emitArticlesChanged();
        if (navigationRef.current) {
          logInfo('SharePipeline', 'Navigating after duplicate shared save', {
            shareId: share.id,
            route: 'Main/Home',
          });
          navigationRef.current.navigate('Main', { screen: 'Home' });
        }
      } else {
        Alert.alert('Error', `Failed to save article: ${errorMessage}`);
      }
    } finally {
      // Always remove from processing set when done
      processingUrlsRef.current.delete(normalizedUrl);
      logInfo('SharePipeline', 'Finished shared URL processing', {
        shareId: share.id,
        source: share.source,
        processingCount: processingUrlsRef.current.size,
      });
    }
  }, [getShareReadinessSnapshot]);

  const flushPendingSharedUrls = useCallback(async () => {
    if (!shareHandlingReadyRef.current || flushingPendingSharesRef.current) {
      logInfo('SharePipeline', 'Flush skipped because share handling is not ready', {
        isReady: shareHandlingReadyRef.current,
        isFlushing: flushingPendingSharesRef.current,
        readiness: getShareReadinessSnapshot(),
      });
      return;
    }

    flushingPendingSharesRef.current = true;
    try {
      logInfo('SharePipeline', 'Flushing pending shared URLs', {
        pendingCount: pendingSharedUrlsRef.current.length,
        readiness: getShareReadinessSnapshot(),
      });
      while (shareHandlingReadyRef.current && pendingSharedUrlsRef.current.length > 0) {
        const nextShare = pendingSharedUrlsRef.current.shift();
        if (nextShare) {
          await handleSharedUrl(nextShare);
        }
      }
    } finally {
      flushingPendingSharesRef.current = false;
      logInfo('SharePipeline', 'Finished flushing pending shared URLs', {
        pendingCount: pendingSharedUrlsRef.current.length,
      });
    }
  }, [getShareReadinessSnapshot, handleSharedUrl]);

  const enqueueSharedUrl = useCallback((url: string, source: string) => {
    const urlDetails = describeArticleUrl(url);
    const normalizedUrl = urlDetails.normalizedUrl.toLowerCase();
    const isAlreadyQueued = pendingSharedUrlsRef.current.some(
      queuedShare => normalizeArticleUrl(queuedShare.url).toLowerCase() === normalizedUrl
    );
    const lastProcessed = recentlyProcessedRef.current.get(normalizedUrl);
    const wasRecentlyProcessed = Boolean(lastProcessed && Date.now() - lastProcessed < 5000);
    const skipReasons = [
      isAlreadyQueued ? 'alreadyQueued' : null,
      processingUrlsRef.current.has(normalizedUrl) ? 'alreadyProcessing' : null,
      wasRecentlyProcessed ? 'recentlyProcessed' : null,
    ].filter(Boolean);

    if (skipReasons.length > 0) {
      logInfo('SharePipeline', 'Shared URL already queued or processed, skipping', {
        source,
        skipReasons,
        url: urlDetails,
        pendingCount: pendingSharedUrlsRef.current.length,
        readiness: getShareReadinessSnapshot(),
      });
      return;
    }

    shareSequenceRef.current += 1;
    const share: PendingSharedUrl = {
      id: `share_${Date.now()}_${shareSequenceRef.current}`,
      url: urlDetails.normalizedUrl,
      originalUrl: url,
      source,
      queuedAt: Date.now(),
    };

    pendingSharedUrlsRef.current.push(share);
    logInfo('SharePipeline', 'Queued shared URL until app is ready', {
      shareId: share.id,
      source,
      url: urlDetails,
      pendingCount: pendingSharedUrlsRef.current.length,
      readiness: getShareReadinessSnapshot(),
    });
    flushPendingSharedUrls().catch(error => {
      logError('SharePipeline', 'Error flushing pending shared URLs', { error });
    });
  }, [flushPendingSharedUrls, getShareReadinessSnapshot]);

  const canProcessShares = showOnboarding === false && isNavigationReady && !isTransitioning;

  useEffect(() => {
    shareHandlingReadyRef.current = canProcessShares;
    if (canProcessShares) {
      logInfo('SharePipeline', 'Share handling ready', {
        pendingCount: pendingSharedUrlsRef.current.length,
        readiness: getShareReadinessSnapshot(),
      });
      flushPendingSharedUrls().catch(error => {
        logError('SharePipeline', 'Error flushing pending shared URLs when ready', { error });
      });
    }
  }, [canProcessShares, flushPendingSharedUrls, getShareReadinessSnapshot]);

  // Check for pending share URLs on startup (cold start case) - supports queue
  useEffect(() => {
    if (SharedIntentModule) {
      const checkPending = async () => {
        try {
          await importNativeShareDebugEvents('beforeStartupPendingShareCheck');
          logInfo('SharePipeline', 'Checking native pending share queue on startup', {
            readiness: getShareReadinessSnapshot(),
            hasQueueMethod: Boolean(SharedIntentModule.checkPendingShareQueue),
            hasSingleMethod: Boolean(SharedIntentModule.checkPendingShareUrl),
          });

          // First try to get all queued URLs
          const pendingUrls = await SharedIntentModule.checkPendingShareQueue?.();
          if (pendingUrls && Array.isArray(pendingUrls) && pendingUrls.length > 0) {
            logInfo('SharePipeline', 'Found pending share URLs from native queue', {
              count: pendingUrls.length,
              urls: pendingUrls.map(describeArticleUrl),
            });
            for (const url of pendingUrls) {
              enqueueSharedUrl(url, 'pendingQueue');
            }
            await importNativeShareDebugEvents('afterStartupPendingQueue');
            return;
          }

          // Fallback to single URL check for backward compatibility
          const pendingUrl = await SharedIntentModule.checkPendingShareUrl?.();
          if (pendingUrl) {
            logInfo('SharePipeline', 'Found single pending share URL on startup', {
              url: describeArticleUrl(pendingUrl),
            });
            enqueueSharedUrl(pendingUrl, 'pendingSingle');
          } else {
            logInfo('SharePipeline', 'No pending share URL on startup', {
              readiness: getShareReadinessSnapshot(),
            });
          }
          await importNativeShareDebugEvents('afterStartupPendingSingle');
        } catch (error) {
          logError('SharePipeline', 'Error checking pending share URLs', { error });
        }
      };
      // Small delay to ensure app is fully mounted
      setTimeout(checkPending, 500);
    }
  }, [enqueueSharedUrl, getShareReadinessSnapshot]);

  // Handle native share events while the app is already running.
  useEffect(() => {
    if (!SharedIntentModule) {
      return;
    }

    const handleNativeShareEvent = (payload: unknown) => {
      const url = typeof payload === 'string'
        ? payload
        : (payload as { url?: string } | null)?.url;

      logInfo('SharePipeline', 'Native share event received', {
        platform: Platform.OS,
        hasUrl: Boolean(url),
        payloadType: typeof payload,
        url: url ? describeArticleUrl(url) : undefined,
      });

      importNativeShareDebugEvents('nativeShareEvent').catch(error => {
        logWarn('NativeShare', 'Failed to import native events after share event', { error });
      });

      if (url) {
        enqueueSharedUrl(url, 'nativeEvent');
      }
    };

    const subscription = Platform.OS === 'ios'
      ? new NativeEventEmitter(SharedIntentModule as any).addListener('onShareIntent', handleNativeShareEvent)
      : DeviceEventEmitter.addListener('onShareIntent', handleNativeShareEvent);

    logInfo('SharePipeline', 'Native share event listener attached', {
      platform: Platform.OS,
    });

    return () => subscription.remove();
  }, [enqueueSharedUrl]);

  // Handle shared URLs via React Native's Linking API (primary path for iOS)
  useEffect(() => {
    // Cold start: check if app was launched from a URL scheme
    Linking.getInitialURL().then((url) => {
      if (url) {
        logInfo('SharePipeline', 'Initial Linking URL received', {
          deepLink: url,
          hasEmbeddedArticleUrl: Boolean(extractUrlFromDeepLink(url)),
        });
        const articleUrl = extractUrlFromDeepLink(url);
        if (articleUrl) {
          logInfo('SharePipeline', 'Initial Linking URL contained article URL', {
            url: describeArticleUrl(articleUrl),
          });
          enqueueSharedUrl(articleUrl, 'initialUrl');
        } else {
          logInfo('SharePipeline', 'Initial Linking URL was an open signal only', {
            deepLink: url,
          });
        }
      }
    }).catch((err) => {
      logError('SharePipeline', 'Error getting initial URL', { error: err });
    });

    // Warm start: listen for URL events from RCTOpenURLNotification
    const subscription = Linking.addEventListener('url', (event) => {
      logInfo('SharePipeline', 'Linking URL event received', {
        deepLink: event.url,
        hasEmbeddedArticleUrl: Boolean(extractUrlFromDeepLink(event.url)),
      });
      const articleUrl = extractUrlFromDeepLink(event.url);
      if (articleUrl) {
        logInfo('SharePipeline', 'Linking URL event contained article URL', {
          url: describeArticleUrl(articleUrl),
        });
        enqueueSharedUrl(articleUrl, 'linkingEvent');
      } else {
        logInfo('SharePipeline', 'Linking URL event was an open signal only', {
          deepLink: event.url,
        });
      }
    });

    return () => subscription.remove();
  }, [enqueueSharedUrl]);

  // Fallback: poll for pending URLs when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && SharedIntentModule) {
        setTimeout(async () => {
          try {
            await importNativeShareDebugEvents('beforeForegroundPendingShareCheck');
            logInfo('SharePipeline', 'Checking native pending share URL on foreground', {
              readiness: getShareReadinessSnapshot(),
            });
            const pendingUrl = await SharedIntentModule.checkPendingShareUrl?.();
            if (pendingUrl) {
              logInfo('SharePipeline', 'Found pending share URL on foreground', {
                url: describeArticleUrl(pendingUrl),
              });
              enqueueSharedUrl(pendingUrl, 'foreground');
            } else {
              logInfo('SharePipeline', 'No pending share URL on foreground', {
                readiness: getShareReadinessSnapshot(),
              });
            }
            await importNativeShareDebugEvents('afterForegroundPendingShareCheck');
          } catch (error) {
            logError('SharePipeline', 'Error checking pending share URLs on foreground', { error });
          }
        }, 500);
      }
    });
    return () => subscription.remove();
  }, [enqueueSharedUrl, getShareReadinessSnapshot]);

  // Show loading while checking onboarding status
  if (showOnboarding === null) {
    return <StartupSplash />;
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
          <NavigationContainer
            key={navigationResetKey}
            ref={navigationRef}
            onReady={() => {
              logInfo('Navigation', 'Navigation container ready');
              setIsNavigationReady(true);
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </Animated.View>

        {!isNavigationReady && (
          <View style={styles.startupOverlay} pointerEvents="auto">
            <StartupSplashContent />
          </View>
        )}

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
        <FeedbackToast />
      </SafeAreaProvider>
    </ShareContext.Provider>
  );
}

// Wrapper to connect theme to GlueStack
function GluestackWrapper() {
  const { settings } = useTheme();
  const systemColorScheme = useColorScheme();

  // Map theme setting to GlueStack colorMode
  const colorMode = settings.theme === 'auto'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : settings.theme;

  return (
    <GluestackUIProvider config={config} colorMode={colorMode}>
      <AppContent />
    </GluestackUIProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SubscriptionProvider>
        <ThemeProvider>
          <GluestackWrapper />
        </ThemeProvider>
      </SubscriptionProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  startupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  startupOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
    backgroundColor: '#000000',
  },
  startupBrand: {
    alignItems: 'center',
    marginBottom: 28,
  },
  startupTitle: {
    color: '#F97316',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0,
  },
  startupSubtitle: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0,
    marginTop: 4,
  },
  startupSpinner: {
    marginTop: 4,
  },
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
