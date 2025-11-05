/**
 * InstaChat App with Share Intent Support
 * Handles shared URLs from other apps
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent() {
  const { getColors } = useTheme();
  const currentColors = getColors();

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={currentColors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
        backgroundColor={currentColors.background}
      />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
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
