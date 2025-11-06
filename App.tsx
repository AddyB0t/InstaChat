/**
 * InstaChat App with Share Intent Support
 * Handles shared URLs from other apps
 */

import React, { useEffect, useRef, createContext, useState, useContext } from 'react';
import { StatusBar, NativeModules, NativeEventEmitter } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';

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
  const navigationRef = useRef<any>(null);

  // Set up global share intent listener
  useEffect(() => {
    if (SharedIntentModule) {
      try {
        const eventEmitter = new NativeEventEmitter(SharedIntentModule);
        const subscription = eventEmitter.addListener(
          'onShareIntent',
          (data: any) => {
            console.log('[App] Share intent received globally:', data);
            if (data && data.url) {
              setSharedUrl(data.url);
              // Navigate to Add tab when URL is shared
              setTimeout(() => {
                if (navigationRef.current) {
                  navigationRef.current.navigate('Add');
                }
              }, 100);
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

export default App;
