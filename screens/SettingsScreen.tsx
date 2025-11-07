/**
 * Settings Screen
 * Configure app appearance, reading preferences, and manage data
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SectionList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { clearAllArticles, AppSettings, addTagsToAllArticles } from '../services/database';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { testAiConnection } from '../services/aiEnhancer';

const SettingsScreen = () => {
  const { settings, updateTheme, getFontSize, getColors } = useTheme();
  const currentColors = getColors();
  const fontSizeStyle = (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl') => ({ fontSize: getFontSize(size), fontFamily: settings.fontFamily === 'serif' ? 'serif' : 'sans-serif' });

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
  const viewOptions: Array<'all' | 'unread'> = ['all', 'unread'];

  const SettingOption = ({
    label,
    value,
    options,
    onSelect,
  }: {
    label: string;
    value: string;
    options: string[];
    onSelect: (option: string) => void;
  }) => (
    <View style={styles.settingItem}>
      <Text style={[styles.settingLabel, { color: currentColors.text }, fontSizeStyle('base')]}>{label}</Text>
      <View style={styles.optionsContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.option,
              value === option
                ? { backgroundColor: currentColors.primary, borderColor: currentColors.primary }
                : { backgroundColor: currentColors.surfaceLight, borderColor: 'transparent' }
            ]}
            onPress={() => onSelect(option)}
          >
            <Text style={[
              styles.optionText,
              value === option
                ? { color: currentColors.text, fontWeight: '600' }
                : { color: currentColors.textSecondary },
              fontSizeStyle('sm')
            ]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.headerTitle, { color: currentColors.text }, fontSizeStyle('xxl')]}>Settings</Text>
      </View>

      {/* APPEARANCE */}
      <View style={[styles.section, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>APPEARANCE</Text>

        <SettingOption
          label="Theme"
          value={settings.theme}
          options={themeOptions}
          onSelect={option => updateSetting('theme', option as 'auto' | 'light' | 'dark')}
        />

        {/* Theme options with icons */}
        <View style={styles.settingItem}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              settings.theme === 'auto'
                ? { backgroundColor: currentColors.primary, borderColor: currentColors.primary }
                : { backgroundColor: currentColors.surfaceLight, borderColor: 'transparent' }
            ]}
            onPress={() => updateSetting('theme', 'auto')}
          >
            <Text style={styles.themeIcon}>🌙</Text>
            <Text style={[
              styles.themeLabel,
              settings.theme === 'auto'
                ? { color: currentColors.text, fontWeight: '600' }
                : { color: currentColors.textSecondary },
              fontSizeStyle('base')
            ]}>
              Auto (System)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              settings.theme === 'light'
                ? { backgroundColor: currentColors.primary, borderColor: currentColors.primary }
                : { backgroundColor: currentColors.surfaceLight, borderColor: 'transparent' }
            ]}
            onPress={() => updateSetting('theme', 'light')}
          >
            <Text style={styles.themeIcon}>☀️</Text>
            <Text style={[
              styles.themeLabel,
              settings.theme === 'light'
                ? { color: currentColors.text, fontWeight: '600' }
                : { color: currentColors.textSecondary },
              fontSizeStyle('base')
            ]}>
              Light
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              settings.theme === 'dark'
                ? { backgroundColor: currentColors.primary, borderColor: currentColors.primary }
                : { backgroundColor: currentColors.surfaceLight, borderColor: 'transparent' }
            ]}
            onPress={() => updateSetting('theme', 'dark')}
          >
            <Text style={styles.themeIcon}>🌙</Text>
            <Text style={[
              styles.themeLabel,
              settings.theme === 'dark'
                ? { color: currentColors.text, fontWeight: '600' }
                : { color: currentColors.textSecondary },
              fontSizeStyle('base')
            ]}>
              Dark
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* READING */}
      <View style={[styles.section, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>READING</Text>

        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: currentColors.text }, fontSizeStyle('base')]}>Font Size</Text>
          <View style={styles.fontSizeContainer}>
            {fontSizeOptions.map(size => {
              const sizeMap: Record<'small' | 'medium' | 'large', number> = {
                small: 12,
                medium: 16,
                large: 20,
              };
              return (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.fontSizeOption,
                    settings.fontSize === size
                      ? { backgroundColor: currentColors.primary, borderColor: currentColors.primary }
                      : { backgroundColor: currentColors.surfaceLight, borderColor: 'transparent' }
                  ]}
                  onPress={() => updateSetting('fontSize', size as 'small' | 'medium' | 'large')}
                >
                  <Text
                    style={[
                      styles.fontSizeText,
                      { fontSize: getFontSize(size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'base') },
                      settings.fontSize === size
                        ? { color: currentColors.text }
                        : { color: currentColors.textSecondary }
                    ]}
                  >
                    A
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <SettingOption
          label="Font Family"
          value={settings.fontFamily}
          options={fontFamilyOptions}
          onSelect={option => updateSetting('fontFamily', option as 'serif' | 'sans-serif')}
        />
      </View>

      {/* DEFAULT VIEW */}
      <View style={[styles.section, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>DEFAULT VIEW</Text>

        <SettingOption
          label="Show on Startup"
          value={settings.defaultView}
          options={viewOptions}
          onSelect={option => updateSetting('defaultView', option as 'all' | 'unread')}
        />
      </View>

      {/* AI ENHANCEMENT */}
      <View style={[styles.section, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>AI ENHANCEMENT ✨</Text>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: currentColors.primary }]}
          onPress={handleTestConnection}
          disabled={isTestingConnection}
        >
          {isTestingConnection ? (
            <>
              <ActivityIndicator color="white" size="small" style={{ marginRight: spacing.sm }} />
              <Text style={[styles.testButtonText, fontSizeStyle('sm')]}>Testing...</Text>
            </>
          ) : (
            <Text style={[styles.testButtonText, fontSizeStyle('sm')]}>🧪 Test AI Connection</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* BULK TAGS */}
      <View style={[styles.section, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>BULK TAGS</Text>

        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: currentColors.text }, fontSizeStyle('base')]}>Add Tags to All Articles</Text>
          <Text style={[styles.settingDescription, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>
            Add tags to all existing articles at once
          </Text>
          <TextInput
            style={[
              styles.bulkTagInput,
              {
                backgroundColor: currentColors.surface,
                borderColor: currentColors.border,
                color: currentColors.text,
              },
              fontSizeStyle('sm'),
            ]}
            placeholder="E.g., tech, reading, important"
            placeholderTextColor={currentColors.textSecondary}
            value={bulkTagInput}
            onChangeText={setBulkTagInput}
            editable={!isAddingTags}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: currentColors.primary }, isAddingTags && styles.buttonDisabled]}
            onPress={handleAddTagsToAll}
            disabled={isAddingTags}
          >
            {isAddingTags ? (
              <>
                <ActivityIndicator color="white" size="small" style={{ marginRight: spacing.sm }} />
                <Text style={[styles.primaryButtonText, fontSizeStyle('sm')]}>Adding Tags...</Text>
              </>
            ) : (
              <Text style={[styles.primaryButtonText, fontSizeStyle('sm')]}>🏷️ Add Tags to All</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* DATA */}
      <View style={[styles.section, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>DATA</Text>

        <TouchableOpacity style={[styles.dangerButton, { backgroundColor: currentColors.error }]} onPress={handleClearData}>
          <Text style={[styles.dangerButtonText, fontSizeStyle('base')]}>🗑️ Clear All Data</Text>
        </TouchableOpacity>

        <Text style={[styles.dangerHint, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>This will permanently delete all your saved articles</Text>
      </View>

      {/* FOOTER */}
      <View style={[styles.footer, { borderTopColor: currentColors.border }]}>
        <Text style={[styles.footerText, { color: currentColors.text }, fontSizeStyle('sm')]}>InstaChat v1.0.0</Text>
        <Text style={[styles.footerSubtext, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>A read-it-later app for saving articles</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.dark.textSecondary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  settingItem: {
    marginBottom: spacing.lg,
  },
  settingLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  optionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.textSecondary,
  },
  optionTextActive: {
    color: colors.dark.text,
    fontWeight: fontWeight.semibold,
  },
  themeOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  themeIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.md,
  },
  themeLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.dark.textSecondary,
  },
  themeLabelActive: {
    color: colors.dark.text,
    fontWeight: fontWeight.semibold,
  },
  fontSizeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  fontSizeOption: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fontSizeOptionActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  fontSizeText: {
    fontWeight: fontWeight.bold,
    color: colors.dark.textSecondary,
  },
  fontSizeTextActive: {
    color: colors.dark.text,
  },
  dangerButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.error,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  dangerHint: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing.sm,
  },
  settingDescription: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing.xs,
  },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    color: colors.dark.text,
    fontSize: fontSize.sm,
  },
  bulkTagInput: {
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginVertical: spacing.md,
    color: colors.dark.text,
    fontSize: fontSize.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  testButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  testButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  footerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  footerSubtext: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing.xs,
  },
});

export default SettingsScreen;
