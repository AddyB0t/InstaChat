/**
 * Root Navigation Structure
 * 3-tab bottom navigation: Home (Stacks), Library, Settings
 * NotiF-style UI with swipe cards
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, useColorScheme } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Screens
import NotifHomeScreen from '../screens/NotifHomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsNewScreen } from '../screens/SettingsNewScreen';
import { ThemeCustomizationScreen } from '../screens/ThemeCustomizationScreen';
import { SortFilterScreen } from '../screens/SortFilterScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import PriorityReviewScreen from '../screens/PriorityReviewScreen';
import PremiumScreen from '../screens/PremiumScreen';
import { useTheme } from '../context/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Home Stack Navigator
 * Handles swipe cards, article detail, and priority review
 */
function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        detachInactiveScreens: false,
        animationEnabled: true,
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
    >
      <Stack.Screen
        name="HomeSwipe"
        component={NotifHomeScreen}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
      />
      <Stack.Screen
        name="PriorityReview"
        component={PriorityReviewScreen}
      />
    </Stack.Navigator>
  );
}

/**
 * Search Stack Navigator
 * Handles search/library list and detail view
 */
function SearchStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        detachInactiveScreens: false,
        animationEnabled: true,
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
    >
      <Stack.Screen
        name="SearchList"
        component={SearchScreen}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
      />
    </Stack.Navigator>
  );
}

/**
 * Settings Stack Navigator
 * Handles settings and sub-screens
 */
function SettingsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        detachInactiveScreens: false,
        animationEnabled: true,
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsNewScreen}
      />
      <Stack.Screen
        name="ThemeCustomization"
        component={ThemeCustomizationScreen}
      />
      <Stack.Screen
        name="SortFilter"
        component={SortFilterScreen}
      />
      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
      />
      <Stack.Screen
        name="PriorityReview"
        component={PriorityReviewScreen}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
      />
    </Stack.Navigator>
  );
}

/**
 * Bottom Tab Navigator
 * 3-tab main navigation structure: Home, Library, Settings
 */
export function RootNavigator() {
  const { settings, getThemedColors } = useTheme();
  const systemColorScheme = useColorScheme();

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  const colors = getThemedColors(isDark);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          title: 'today',
          tabBarLabel: 'today',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Icon
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={focused ? colors.accent.primary : colors.text.tertiary}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={SearchStackNavigator}
        options={{
          title: 'library',
          tabBarLabel: 'library',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Icon
                name={focused ? 'library' : 'library-outline'}
                size={24}
                color={focused ? colors.accent.primary : colors.text.tertiary}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          title: 'settings',
          tabBarLabel: 'settings',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Icon
                name={focused ? 'settings' : 'settings-outline'}
                size={24}
                color={focused ? colors.accent.primary : colors.text.tertiary}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
