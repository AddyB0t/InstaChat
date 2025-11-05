/**
 * Root Navigation Structure
 * 5-tab bottom navigation: Folders, Tags, +Add, Library, Settings
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import FoldersScreen from '../screens/FoldersScreen';
import TagsScreen from '../screens/TagsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../styles/theme';
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
        component={LibraryScreen}
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
        component={HomeScreen}
      />
    </Stack.Navigator>
  );
}

/**
 * Bottom Tab Navigator
 * 5-tab main navigation structure
 */
export function RootNavigator() {
  const { getColors } = useTheme();
  const currentColors = getColors();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: currentColors.primary,
        tabBarInactiveTintColor: currentColors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: currentColors.surface,
          borderTopColor: currentColors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="Folders"
        component={FoldersScreen}
        options={{
          title: 'Folders',
          tabBarLabel: 'Folders',
          tabBarIcon: () => <TabIcon icon="📁" />,
        }}
      />
      <Tab.Screen
        name="Tags"
        component={TagsScreen}
        options={{
          title: 'Tags',
          tabBarLabel: 'Tags',
          tabBarIcon: () => <TabIcon icon="🏷️" />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddStackNavigator}
        options={{
          title: 'Add',
          tabBarLabel: 'Add',
          tabBarIcon: () => <TabIcon icon="➕" />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStackNavigator}
        options={{
          title: 'Library',
          tabBarLabel: 'Library',
          tabBarIcon: () => <TabIcon icon="📚" />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: () => <TabIcon icon="⚙️" />,
        }}
      />
    </Tab.Navigator>
  );
}
