/**
 * InstaChat App with Share Intent Support
 * Handles shared URLs from other apps
 */

import React, { useEffect, useRef, createContext, useState, useContext } from 'react';
import { StatusBar, NativeModules, NativeEventEmitter, Alert, ToastAndroid, View, ActivityIndicator, Modal, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { extractAndCreateArticle } from './services/articleExtractor';
import { saveArticle } from './services/database';

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
  const navigationRef = useRef<any>(null);

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
              console.log('[App] Auto-saving shared article:', data.url);
              setIsSaving(true);
              try {
                // Extract and save article automatically
                const article = await extractAndCreateArticle(data.url);
                await saveArticle(article);

                console.log('[App] Article auto-saved successfully:', article.id);

                // Show toast notification
                ToastAndroid.show('Article saved!', ToastAndroid.SHORT);

                // Navigate to Library to show the saved article
                setTimeout(() => {
                  setIsSaving(false);
                  if (navigationRef.current) {
                    navigationRef.current.navigate('Library');
                  }
                }, 500);

              } catch (error) {
                console.error('[App] Error auto-saving shared article:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setIsSaving(false);
                Alert.alert('Error', `Failed to save article: ${errorMessage}`);
              }
            }
          }
        );

        return () => subscription.remove();
      } catch (error) {
        console.log('[App] Error setting up share intent listener:', error);
      }
    }
  }, []);

  return (
    <ShareContext.Provider value={{ sharedUrl, setSharedUrl }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={currentColors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
          backgroundColor={currentColors.background}
        />
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>

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

function App() {
  return (
    <ThemeProvider>
      <AppContent />
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
