/**
 * Settings Screen
 * Configure app appearance, collections, notifications, and account
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from '../context/ThemeContext';
import { getThemeColors } from '../styles/notifTheme';
import { wp, hp, fp, ms } from '../utils/responsive';
import { clearAllArticles } from '../services/database';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  const { settings, updateSettings } = useContext(ThemeContext);
  const systemColorScheme = useColorScheme();
  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  const colors = getThemeColors(isDark);

  const handleThemePress = () => {
    // Navigate to theme selection screen or show modal
    Alert.alert(
      'Select Theme',
      'Choose your preferred theme',
      [
        { text: 'Auto (System)', onPress: () => updateSettings({ theme: 'auto' }) },
        { text: 'Light', onPress: () => updateSettings({ theme: 'light' }) },
        { text: 'Dark', onPress: () => updateSettings({ theme: 'dark' }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDarkModeToggle = (value: boolean) => {
    updateSettings({ theme: value ? 'dark' : 'light' });
  };

  const handleSortFilterPress = () => {
    Alert.alert('Sort & Filter', 'Sort and filter options coming soon!');
  };

  const handleNotificationsPress = () => {
    Alert.alert('Smart Notifications', 'Notification settings coming soon!');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => {
          // Handle logout logic
          Alert.alert('Logged out', 'You have been signed out.');
        }},
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all saved articles? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllArticles();
            Alert.alert('Success', 'All articles have been deleted');
          },
        },
      ]
    );
  };

  const handleResetTutorial = () => {
    Alert.alert(
      'Reset Tutorials',
      'Which tutorial would you like to reset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Home Screen',
          onPress: async () => {
            await updateSettings({ hasCompletedOnboarding: false });
            Alert.alert('Tutorial Reset', 'The home screen tutorial will show when you return to the home screen.');
          },
        },
        {
          text: 'Priority Screen',
          onPress: async () => {
            await updateSettings({ hasCompletedPriorityTutorial: false });
            Alert.alert('Tutorial Reset', 'The priority tutorial will show when you visit the Priority screen.');
          },
        },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: async () => {
            await updateSettings({ hasCompletedOnboarding: false, hasCompletedPriorityTutorial: false });
            Alert.alert('Tutorials Reset', 'All tutorials will show again.');
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    iconBgColor,
    title,
    subtitle,
    onPress,
    rightElement,
    showChevron = true,
  }: {
    icon: string;
    iconBgColor: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingRow, { backgroundColor: colors.background.secondary }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIconBox, { backgroundColor: iconBgColor }]}>
        <Icon name={icon} size={ms(22)} color="#FFFFFF" />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.text.tertiary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
      {showChevron && !rightElement && (
        <Icon name="chevron-forward" size={ms(20)} color={colors.text.tertiary} />
      )}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>
      {title}
    </Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={ms(24)} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Appearance Section */}
        <SectionHeader title="Appearance" />
        <View style={styles.sectionContainer}>
          <SettingRow
            icon="color-palette"
            iconBgColor={colors.accent.primary}
            title="Theme"
            subtitle="Customize accent and background colors"
            onPress={handleThemePress}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="moon"
            iconBgColor="#1F2937"
            title="Dark Mode"
            subtitle="Switch between light and dark theme"
            showChevron={false}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: '#3e3e3e', true: colors.accent.primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </View>

        {/* Collections Section */}
        <SectionHeader title="Collections" />
        <View style={styles.sectionContainer}>
          <SettingRow
            icon="funnel"
            iconBgColor={colors.accent.primary}
            title="Sort & Filter"
            subtitle="Organize your bookmarks"
            onPress={handleSortFilterPress}
          />
        </View>

        {/* Notifications Section */}
        <SectionHeader title="Notifications" />
        <View style={styles.sectionContainer}>
          <SettingRow
            icon="notifications"
            iconBgColor={colors.accent.primary}
            title="Smart Notifications"
            subtitle="Manage reminders and review schedules"
            onPress={handleNotificationsPress}
          />
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.sectionContainer}>
          <SettingRow
            icon="log-out-outline"
            iconBgColor="#EF4444"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
          />
        </View>

        {/* Data Management Section */}
        <SectionHeader title="Data" />
        <View style={styles.sectionContainer}>
          <SettingRow
            icon="trash-outline"
            iconBgColor="#EF4444"
            title="Clear All Data"
            subtitle="Delete all saved articles"
            onPress={handleClearData}
          />
        </View>

        {/* Help Section */}
        <SectionHeader title="Help" />
        <View style={styles.sectionContainer}>
          <SettingRow
            icon="school-outline"
            iconBgColor={colors.accent.primary}
            title="Reset Tutorial"
            subtitle="Replay the onboarding walkthrough"
            onPress={handleResetTutorial}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
            NotiF v1.0.0
          </Text>
          <Text style={[styles.footerSubtext, { color: colors.text.tertiary }]}>
            Save it. Swipe it. Read it later.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(16),
    paddingVertical: hp(16),
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: fp(20),
    fontWeight: '600',
  },
  headerSpacer: {
    width: ms(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(16),
    paddingBottom: hp(40),
  },
  sectionHeader: {
    fontSize: fp(18),
    fontWeight: '600',
    marginTop: hp(24),
    marginBottom: hp(12),
    marginLeft: wp(4),
  },
  sectionContainer: {
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(14),
    paddingHorizontal: wp(16),
  },
  settingIconBox: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(14),
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fp(16),
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: fp(13),
    marginTop: hp(2),
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    marginLeft: wp(70),
  },
  footer: {
    alignItems: 'center',
    paddingVertical: hp(32),
  },
  footerText: {
    fontSize: fp(14),
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: fp(12),
    marginTop: hp(4),
  },
});

export default SettingsScreen;
