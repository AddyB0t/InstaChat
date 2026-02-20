/**
 * Settings Screen with GlueStack UI
 * Minimalist configuration interface using GlueStack components
 */

import React, { useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from 'react-native';
import { clearAllArticles, AppSettings, addTagsToAllArticles } from '../services/database';
import { useTheme } from '../context/ThemeContext';
import { useGlueStackTheme } from '../context/GlueStackThemeContext';
import { testAiConnection } from '../services/aiEnhancer';
import { GlueStackBox } from '../components/GlueStackBox';
import { GlueStackText } from '../components/GlueStackText';
import { GlueStackButton } from '../components/GlueStackButton';

const SettingsScreenGlueStack = () => {
  const { settings, updateTheme, getColors } = useTheme();
  const { theme, toggleTheme } = useGlueStackTheme();
  const currentColors = getColors();

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

  const themeOptions: Array<'auto' | 'light' | 'dark'> = ['auto', 'light', 'dark'];
  const fontSizeOptions: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  const fontFamilyOptions: Array<'serif' | 'sans-serif'> = ['serif', 'sans-serif'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <GlueStackBox p={24} borderBottomWidth={1} borderColor={currentColors.border}>
        <GlueStackText size="2xl" weight="700">
          Settings
        </GlueStackText>
      </GlueStackBox>

      {/* APPEARANCE SECTION */}
      <GlueStackBox p={24} borderBottomWidth={1} borderColor={currentColors.border}>
        <GlueStackText size="xs" weight="600" color="textSecondary" style={{ marginBottom: 16 }}>
          APPEARANCE
        </GlueStackText>

        {/* Theme Selection */}
        <GlueStackBox mb={24}>
          <GlueStackText size="base" weight="600" style={{ marginBottom: 12 }}>
            Theme
          </GlueStackText>
          <GlueStackBox flexDirection="row" gap={8}>
            {themeOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      settings.theme === option ? currentColors.primary : currentColors.surfaceLight,
                    flex: 1,
                  },
                ]}
                onPress={() => updateSetting('theme', option)}
              >
                <GlueStackText
                  size="sm"
                  weight="600"
                  color={settings.theme === option ? 'text' : 'textSecondary'}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </GlueStackText>
              </TouchableOpacity>
            ))}
          </GlueStackBox>
        </GlueStackBox>

        {/* Theme Icons */}
        <GlueStackBox gap={12}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              {
                backgroundColor:
                  settings.theme === 'auto' ? currentColors.primary : currentColors.surfaceLight,
                paddingHorizontal: 16,
                paddingVertical: 12,
              },
            ]}
            onPress={() => updateSetting('theme', 'auto')}
          >
            <GlueStackBox flexDirection="row" alignItems="center" gap={12}>
              <GlueStackText size="lg">🌙</GlueStackText>
              <GlueStackText
                size="base"
                weight="600"
                color={settings.theme === 'auto' ? 'text' : 'textSecondary'}
              >
                Auto (System)
              </GlueStackText>
            </GlueStackBox>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              {
                backgroundColor:
                  settings.theme === 'light' ? currentColors.primary : currentColors.surfaceLight,
                paddingHorizontal: 16,
                paddingVertical: 12,
              },
            ]}
            onPress={() => updateSetting('theme', 'light')}
          >
            <GlueStackBox flexDirection="row" alignItems="center" gap={12}>
              <GlueStackText size="lg">☀️</GlueStackText>
              <GlueStackText
                size="base"
                weight="600"
                color={settings.theme === 'light' ? 'text' : 'textSecondary'}
              >
                Light
              </GlueStackText>
            </GlueStackBox>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              {
                backgroundColor:
                  settings.theme === 'dark' ? currentColors.primary : currentColors.surfaceLight,
                paddingHorizontal: 16,
                paddingVertical: 12,
              },
            ]}
            onPress={() => updateSetting('theme', 'dark')}
          >
            <GlueStackBox flexDirection="row" alignItems="center" gap={12}>
              <GlueStackText size="lg">🌙</GlueStackText>
              <GlueStackText
                size="base"
                weight="600"
                color={settings.theme === 'dark' ? 'text' : 'textSecondary'}
              >
                Dark
              </GlueStackText>
            </GlueStackBox>
          </TouchableOpacity>
        </GlueStackBox>
      </GlueStackBox>

      {/* READING SECTION */}
      <GlueStackBox p={24} borderBottomWidth={1} borderColor={currentColors.border}>
        <GlueStackText size="xs" weight="600" color="textSecondary" style={{ marginBottom: 16 }}>
          READING
        </GlueStackText>

        {/* Font Size */}
        <GlueStackBox mb={24}>
          <GlueStackText size="base" weight="600" style={{ marginBottom: 12 }}>
            Font Size
          </GlueStackText>
          <GlueStackBox flexDirection="row" gap={12} justifyContent="center">
            {fontSizeOptions.map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.fontSizeButton,
                  {
                    backgroundColor:
                      settings.fontSize === size ? currentColors.primary : currentColors.surfaceLight,
                  },
                ]}
                onPress={() => updateSetting('fontSize', size as 'small' | 'medium' | 'large')}
              >
                <GlueStackText
                  size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'base'}
                  weight="700"
                  color={settings.fontSize === size ? 'text' : 'textSecondary'}
                >
                  A
                </GlueStackText>
              </TouchableOpacity>
            ))}
          </GlueStackBox>
        </GlueStackBox>

        {/* Font Family */}
        <GlueStackBox>
          <GlueStackText size="base" weight="600" style={{ marginBottom: 12 }}>
            Font Family
          </GlueStackText>
          <GlueStackBox flexDirection="row" gap={8}>
            {fontFamilyOptions.map(fontFamily => (
              <TouchableOpacity
                key={fontFamily}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      settings.fontFamily === fontFamily ? currentColors.primary : currentColors.surfaceLight,
                    flex: 1,
                  },
                ]}
                onPress={() => updateSetting('fontFamily', fontFamily as 'serif' | 'sans-serif')}
              >
                <GlueStackText
                  size="sm"
                  weight="600"
                  color={settings.fontFamily === fontFamily ? 'text' : 'textSecondary'}
                >
                  {fontFamily === 'serif' ? 'Serif' : 'Sans-Serif'}
                </GlueStackText>
              </TouchableOpacity>
            ))}
          </GlueStackBox>
        </GlueStackBox>
      </GlueStackBox>

      {/* AI ENHANCEMENT SECTION */}
      <GlueStackBox p={24} borderBottomWidth={1} borderColor={currentColors.border}>
        <GlueStackText size="xs" weight="600" color="textSecondary" style={{ marginBottom: 16 }}>
          AI ENHANCEMENT ✨
        </GlueStackText>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentColors.primary }]}
          onPress={handleTestConnection}
          disabled={isTestingConnection}
        >
          {isTestingConnection ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <GlueStackText size="sm" weight="600" color="text" style={{ color: '#FFFFFF' }}>
              🧪 Test AI Connection
            </GlueStackText>
          )}
        </TouchableOpacity>
      </GlueStackBox>

      {/* BULK TAGS SECTION */}
      <GlueStackBox p={24} borderBottomWidth={1} borderColor={currentColors.border}>
        <GlueStackText size="xs" weight="600" color="textSecondary" style={{ marginBottom: 16 }}>
          BULK TAGS
        </GlueStackText>

        <GlueStackText size="base" weight="600" style={{ marginBottom: 8 }}>
          Add Tags to All Articles
        </GlueStackText>

        <GlueStackText size="xs" color="textSecondary" style={{ marginBottom: 12 }}>
          Add tags to all existing articles at once
        </GlueStackText>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: currentColors.surface,
              borderColor: currentColors.border,
              color: currentColors.text,
            },
          ]}
          placeholder="E.g., tech, reading, important"
          placeholderTextColor={currentColors.textSecondary}
          value={bulkTagInput}
          onChangeText={setBulkTagInput}
          editable={!isAddingTags}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentColors.primary, opacity: isAddingTags ? 0.6 : 1 }]}
          onPress={handleAddTagsToAll}
          disabled={isAddingTags}
        >
          {isAddingTags ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <GlueStackText size="sm" weight="600" style={{ color: '#FFFFFF' }}>
              🏷️ Add Tags to All
            </GlueStackText>
          )}
        </TouchableOpacity>
      </GlueStackBox>

      {/* DATA SECTION */}
      <GlueStackBox p={24} borderBottomWidth={1} borderColor={currentColors.border}>
        <GlueStackText size="xs" weight="600" color="textSecondary" style={{ marginBottom: 16 }}>
          DATA
        </GlueStackText>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentColors.error }]}
          onPress={handleClearData}
        >
          <GlueStackText size="base" weight="600" style={{ color: '#FFFFFF' }}>
            🗑️ Clear All Data
          </GlueStackText>
        </TouchableOpacity>

        <GlueStackText size="xs" color="textSecondary" style={{ marginTop: 12, textAlign: 'center' }}>
          This will permanently delete all your saved articles
        </GlueStackText>
      </GlueStackBox>

      {/* Footer */}
      <GlueStackBox p={32} alignItems="center" borderTopWidth={1} borderColor={currentColors.border}>
        <GlueStackText size="sm" weight="600">
          NotiF v2.0
        </GlueStackText>
        <GlueStackText size="xs" color="textSecondary" style={{ marginTop: 8 }}>
          A read-it-later app for saving articles
        </GlueStackText>
      </GlueStackBox>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
  },
});

export default SettingsScreenGlueStack;
