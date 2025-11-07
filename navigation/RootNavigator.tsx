/**
 * Root Navigation Structure
 * 4-tab bottom navigation: Home, Add, Library, Settings
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

// Screens
import BrowseGlueStack from '../screens/BrowseGlueStack';
import HomeScreenGlueStack from '../screens/HomeScreenGlueStack';
import LibraryGlueStack from '../screens/LibraryGlueStack';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import SettingsGlueStack from '../screens/SettingsGlueStack';
import { useTheme } from '../context/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Tab icon component - Returns just the emoji icon
 */
const TabIcon = ({ icon }: { icon: string }) => (
  <Text style={{ fontSize: 24 }}>{icon}</Text>
);

/**
 * Browse Stack Navigator
 * Handles Browse list and detail view
 */
function BrowseStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="BrowseList"
        component={BrowseGlueStack}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={({ route }: any) => ({
          title: route.params?.title || 'Article',
          headerShown: true,
        })}
      />
    </Stack.Navigator>
  );
}

/**
 * Library Stack Navigator
 * Handles Library list and detail view
 */
function LibraryStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="LibraryList"
        component={LibraryGlueStack}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={({ route }: any) => ({
          title: route.params?.title || 'Article',
          headerShown: true,
        })}
      />
    </Stack.Navigator>
  );
}

/**
 * Add Article Stack Navigator
 * Handles adding articles via share intent
 */
function AddStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="AddArticle"
        component={HomeScreenGlueStack}
      />
    </Stack.Navigator>
  );
}

/**
 * Bottom Tab Navigator
 * 5-tab main navigation structure
 */
export function RootNavigator() {
  const { getColors, settings } = useTheme();
  const currentColors = getColors();

  // Match the background to GlueStack's $backgroundDark900 / $backgroundLight0
  const navBarBg = settings.theme === 'light' || (settings.theme === 'auto' && currentColors.background === '#FFFFFF')
    ? '#FFFFFF'
    : '#121212';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: currentColors.primary,
        tabBarInactiveTintColor: currentColors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: navBarBg,
          borderTopColor: currentColors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={BrowseStackNavigator}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: () => <TabIcon icon="🏠" />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddStackNavigator}
        options={{
          title: 'Add',
          tabBarLabel: 'Add',
          tabBarIcon: () => <TabIcon icon="✚" />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStackNavigator}
        options={{
          title: 'Library',
          tabBarLabel: 'Library',
          tabBarIcon: () => <TabIcon icon="📄" />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsGlueStack}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: () => <TabIcon icon="⚙" />,
        }}
      />
    </Tab.Navigator>
  );
}
