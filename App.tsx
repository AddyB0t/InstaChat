/**
 * InstaChat App with Share Intent Support
 * Handles shared URLs from other apps
 */

import React, { useEffect, useRef, createContext, useState, useContext } from 'react';
import { StatusBar, NativeModules, NativeEventEmitter, Alert, ToastAndroid, View, ActivityIndicator, Modal, Text, StyleSheet, Animated, DeviceEventEmitter } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootNavigator } from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { extractAndCreateArticle, enhanceArticleInBackground } from './services/articleExtractor';
import { saveArticle, updateArticle } from './services/database';
import OnboardingScreen from './screens/OnboardingScreen';

const ONBOARDING_KEY = '@instachat_onboarding_complete';

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

function AppContent() {
  const { getColors } = useTheme();
  const currentColors = getColors();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const mainFadeAnim = useRef(new Animated.Value(0)).current;
  const navigationRef = useRef<any>(null);

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
    console.log('[App] Auto-saving shared article:', url);
    setIsSaving(true);
    try {
      // Extract article (FAST - no AI)
      const article = await extractAndCreateArticle(url);

      // Save immediately
      await saveArticle(article);
      console.log('[App] Article saved instantly:', article.id);

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
        ToastAndroid.show('Already in your library!', ToastAndroid.SHORT);
        DeviceEventEmitter.emit('refreshArticles');
        if (navigationRef.current) {
          navigationRef.current.navigate('Main', { screen: 'Home' });
        }
      } else {
        Alert.alert('Error', `Failed to save article: ${errorMessage}`);
      }
    }
  };

  // Check for pending share URL on startup (cold start case)
  useEffect(() => {
    if (SharedIntentModule) {
      const checkPending = async () => {
        try {
          const pendingUrl = await SharedIntentModule.checkPendingShareUrl();
          if (pendingUrl) {
            console.log('[App] Found pending share URL from cold start:', pendingUrl);
            handleSharedUrl(pendingUrl);
          }
        } catch (error) {
          console.log('[App] Error checking pending share URL:', error);
        }
      };
      // Small delay to ensure app is fully mounted
      setTimeout(checkPending, 500);
    }
  }, []);

  // Set up global share intent listener with auto-save
  useEffect(() => {
    if (SharedIntentModule) {
      try {
        const eventEmitter = new NativeEventEmitter(SharedIntentModule);
        const subscription = eventEmitter.addListener(
          'onShareIntent',
          async (data: any) => {
            console.log('[App] Share intent received globally:', data);
            if (data && data.url) {
              handleSharedUrl(data.url);
            }
          }
        );

        return () => subscription.remove();
      } catch (error) {
        console.log('[App] Error setting up share intent listener:', error);
      }
    }
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
    <ThemeProvider>
      <GluestackWrapper />
    </ThemeProvider>
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
