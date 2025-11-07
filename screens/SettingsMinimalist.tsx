/**
 * Minimalist Settings Screen
 * Clean UI with NativeWind (Tailwind CSS)
 */

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { clearAllArticles, AppSettings, addTagsToAllArticles } from '../services/database';
import { useTheme } from '../context/ThemeContext';
import { testAiConnection } from '../services/aiEnhancer';

const SettingsMinimalist = () => {
  const { settings, updateTheme } = useTheme();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isAddingTags, setIsAddingTags] = useState(false);

  const handleAddTagsToAll = async () => {
    if (!bulkTagInput.trim()) {
      Alert.alert('Error', 'Please enter at least one tag');
      return;
    }

    Alert.alert(
      'Add Tags to All Articles',
      `Add tags "${bulkTagInput}" to all existing articles?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Add Tags',
          onPress: async () => {
            setIsAddingTags(true);
            try {
              const tags = bulkTagInput
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
              const updatedCount = await addTagsToAllArticles(tags);
              setBulkTagInput('');
              Alert.alert('Success', `Tags added to ${updatedCount} articles`);
            } catch (error) {
              Alert.alert('Error', 'Failed to add tags to articles');
            } finally {
              setIsAddingTags(false);
            }
          },
        },
      ]
    );
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testAiConnection();
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Connection Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    try {
      await updateTheme(key, value);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const handleClearData = () => {
    Alert.alert('Clear All Data', 'Are you sure you want to delete all saved articles? This cannot be undone.', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Clear All Data',
        onPress: async () => {
          await clearAllArticles();
          Alert.alert('Success', 'All articles have been deleted');
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-900">
      <View className="p-6 space-y-6">
        {/* Header */}
        <Text className="text-3xl font-bold text-slate-900 dark:text-white">
          Settings
        </Text>

        {/* APPEARANCE Section */}
        <View className="space-y-4">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            APPEARANCE
          </Text>

          <View className="space-y-3">
            <Text className="text-base font-medium text-slate-900 dark:text-white">
              Theme
            </Text>
            <View className="flex-row space-x-2">
              {(['auto', 'light', 'dark'] as const).map((theme) => (
                <TouchableOpacity
                  key={theme}
                  onPress={() => updateSetting('theme', theme)}
                  className={`flex-1 py-3 px-4 rounded-lg items-center ${
                    settings.theme === theme
                      ? 'bg-blue-500 dark:bg-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      settings.theme === theme
                        ? 'text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Divider */}
        <View className="h-px bg-slate-200 dark:bg-slate-700" />

        {/* READING Section */}
        <View className="space-y-4">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            READING
          </Text>

          <View className="space-y-3">
            <Text className="text-base font-medium text-slate-900 dark:text-white">
              Font Size
            </Text>
            <View className="flex-row justify-center space-x-4">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => updateSetting('fontSize', size)}
                  className={`w-16 h-16 rounded-lg items-center justify-center ${
                    settings.fontSize === size
                      ? 'bg-blue-500 dark:bg-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <Text
                    className={`font-bold ${
                      size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
                    } ${
                      settings.fontSize === size
                        ? 'text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    A
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="space-y-3">
            <Text className="text-base font-medium text-slate-900 dark:text-white">
              Font Family
            </Text>
            <View className="flex-row space-x-2">
              {(['serif', 'sans-serif'] as const).map((font) => (
                <TouchableOpacity
                  key={font}
                  onPress={() => updateSetting('fontFamily', font)}
                  className={`flex-1 py-3 px-4 rounded-lg items-center ${
                    settings.fontFamily === font
                      ? 'bg-blue-500 dark:bg-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      settings.fontFamily === font
                        ? 'text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {font === 'serif' ? 'Serif' : 'Sans-Serif'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Divider */}
        <View className="h-px bg-slate-200 dark:bg-slate-700" />

        {/* AI ENHANCEMENT Section */}
        <View className="space-y-4">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            AI ENHANCEMENT ✨
          </Text>

          <TouchableOpacity
            onPress={handleTestConnection}
            disabled={isTestingConnection}
            className={`py-3 px-4 rounded-lg items-center bg-blue-500 dark:bg-blue-600 ${
              isTestingConnection ? 'opacity-60' : ''
            }`}
          >
            {isTestingConnection ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">
                🧪 Test AI Connection
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="h-px bg-slate-200 dark:bg-slate-700" />

        {/* BULK TAGS Section */}
        <View className="space-y-4">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            BULK TAGS
          </Text>

          <View className="space-y-3">
            <Text className="text-base font-medium text-slate-900 dark:text-white">
              Add Tags to All Articles
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Add tags to all existing articles at once
            </Text>

            <TextInput
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              placeholder="E.g., tech, reading, important"
              placeholderTextColor="#94a3b8"
              value={bulkTagInput}
              onChangeText={setBulkTagInput}
              editable={!isAddingTags}
            />

            <TouchableOpacity
              onPress={handleAddTagsToAll}
              disabled={isAddingTags}
              className={`py-3 px-4 rounded-lg items-center bg-blue-500 dark:bg-blue-600 ${
                isAddingTags ? 'opacity-60' : ''
              }`}
            >
              {isAddingTags ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">
                  🏷️ Add Tags to All
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View className="h-px bg-slate-200 dark:bg-slate-700" />

        {/* DATA Section */}
        <View className="space-y-4">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            DATA
          </Text>

          <TouchableOpacity
            onPress={handleClearData}
            className="py-3 px-4 rounded-lg items-center bg-red-500 dark:bg-red-600"
          >
            <Text className="text-white font-semibold">
              🗑️ Clear All Data
            </Text>
          </TouchableOpacity>

          <Text className="text-xs text-slate-500 dark:text-slate-400 text-center">
            This will permanently delete all your saved articles
          </Text>
        </View>

        {/* Divider */}
        <View className="h-px bg-slate-200 dark:bg-slate-700" />

        {/* Footer */}
        <View className="items-center space-y-2 py-8">
          <Text className="text-sm font-semibold text-slate-900 dark:text-white">
            InstaChat v1.0.0
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            A read-it-later app for saving articles
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SettingsMinimalist;