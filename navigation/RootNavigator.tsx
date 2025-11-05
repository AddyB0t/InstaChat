/**
 * Root Navigation Structure
 * Bottom tab navigation with Home and Articles screens
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ArticlesScreen from '../screens/ArticlesScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Simple icon component using text
 */
const TabIcon = ({ label }: { label: string }) => (
  <Text style={{ fontSize: 20, marginBottom: 4 }}>{label}</Text>
);

/**
 * Articles Stack Navigator
 * Handles Articles list and detail view
 */
function ArticlesStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ArticlesList"
        component={ArticlesScreen}
        options={{
          title: 'Saved Articles',
          headerShown: true,
        }}
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
 * Home Stack Navigator
 * Handles Home screen with share intent
 */
function HomeStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{
          title: 'InstaChat',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Bottom Tab Navigator
 * Main navigation structure
 */
export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196f3',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          title: 'Share',
          tabBarLabel: 'Share',
        }}
      />
      <Tab.Screen
        name="Articles"
        component={ArticlesStackNavigator}
        options={{
          title: 'Articles',
          tabBarLabel: 'Saved',
        }}
      />
    </Tab.Navigator>
  );
}
