/**
 * SettingsNewScreen
 * NotiF-style settings matching reference design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  useColorScheme,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../styles/notifTheme';
import { getAllArticles } from '../services/database';
import { wp, hp, fp, ms } from '../utils/responsive';

interface SettingsNewScreenProps {
  navigation: any;
}

// Setting Row Component - defined outside main component
const SettingRow = ({
  iconName,
  iconBgColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
  colors,
}: {
  iconName: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  colors: ThemeColors;
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress && !rightElement}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
      <Icon name={iconName} size={ms(22)} color="#FFFFFF" />
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
        {title}
      </Text>
      <Text style={[styles.settingSubtitle, { color: colors.text.tertiary }]}>
        {subtitle}
      </Text>
    </View>
    {rightElement}
    {showChevron && !rightElement && (
      <Icon name="chevron-forward" size={ms(20)} color={colors.text.tertiary} />
    )}
  </TouchableOpacity>
);

// Section Header Component - defined outside main component
const SectionHeader = ({ title, colors }: { title: string; colors: ThemeColors }) => (
  <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>
    {title}
  </Text>
);

export const SettingsNewScreen: React.FC<SettingsNewScreenProps> = ({ navigation }) => {
  const { settings, updateTheme, getThemedColors } = useTheme();
  const systemColorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [bookmarkedCount, setBookmarkedCount] = useState(0);

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  const colors = getThemedColors(isDark);

  useEffect(() => {
    loadBookmarkedCount();
  }, [settings]);

  const loadBookmarkedCount = async () => {
    try {
      const articles = await getAllArticles();
      const count = articles.filter(a => a.isBookmarked).length;
      setBookmarkedCount(count);
    } catch (error) {
      console.error('Error loading bookmarked count:', error);
    }
  };

  const handleThemePress = () => {
    navigation.navigate('ThemeCustomization');
  };

  const handleDarkModeToggle = (value: boolean) => {
    updateTheme('theme', value ? 'dark' : 'light');
  };

  const handleBookmarkedPress = () => {
    // Navigate to Library tab with bookmarked filter and grid view
    navigation.navigate('Library', {
      screen: 'SearchList',
      params: { filter: 'bookmarked', viewMode: 'grid' },
    });
  };

  const handleSortFilterPress = () => {
    navigation.navigate('SortFilter');
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
          Alert.alert('Logged out', 'You have been signed out.');
        }},
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
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
        <SectionHeader title="Appearance" colors={colors} />
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          <SettingRow
            iconName="color-palette"
            iconBgColor={colors.accent.primary}
            title="Theme"
            subtitle="Customize accent and background colors"
            onPress={handleThemePress}
            colors={colors}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            iconName="moon"
            iconBgColor="#1F2937"
            title="Dark Mode"
            subtitle="Switch between light and dark theme"
            showChevron={false}
            colors={colors}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: '#4B5563', true: colors.accent.primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </View>

        {/* Collections Section */}
        <SectionHeader title="Collections" colors={colors} />
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          <SettingRow
            iconName="bookmark"
            iconBgColor="#F59E0B"
            title="Bookmarked"
            subtitle="View your saved bookmarks"
            onPress={handleBookmarkedPress}
            showChevron={bookmarkedCount === 0}
            colors={colors}
            rightElement={
              bookmarkedCount > 0 ? (
                <View style={styles.badgeChevronRow}>
                  <View style={[styles.countBadge, { borderColor: colors.text.tertiary }]}>
                    <Text style={[styles.countText, { color: colors.text.secondary }]}>
                      {bookmarkedCount}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={ms(20)} color={colors.text.tertiary} />
                </View>
              ) : undefined
            }
          />
          <View style={styles.rowDivider} />
          <SettingRow
            iconName="funnel"
            iconBgColor={colors.accent.primary}
            title="Sort & Filter"
            subtitle="Organize your bookmarks"
            onPress={handleSortFilterPress}
            colors={colors}
          />
        </View>

        {/* Notifications Section */}
        <SectionHeader title="Notifications" colors={colors} />
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          <SettingRow
            iconName="notifications"
            iconBgColor={colors.accent.primary}
            title="Smart Notifications"
            subtitle="Manage reminders and review schedules"
            onPress={handleNotificationsPress}
            colors={colors}
          />
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" colors={colors} />
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          <SettingRow
            iconName="log-out-outline"
            iconBgColor="#EF4444"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            colors={colors}
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
    </View>
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
    paddingVertical: hp(12),
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: fp(18),
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
    fontSize: fp(16),
    fontWeight: '600',
    marginTop: hp(24),
    marginBottom: hp(10),
    marginLeft: wp(4),
  },
  sectionCard: {
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(14),
    paddingHorizontal: wp(14),
  },
  iconBox: {
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
    fontSize: fp(15),
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: fp(12),
    marginTop: hp(2),
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    marginLeft: wp(68),
  },
  badgeChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
  },
  countBadge: {
    paddingHorizontal: wp(10),
    paddingVertical: hp(4),
    borderRadius: ms(12),
    borderWidth: 1,
  },
  countText: {
    fontSize: fp(14),
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: hp(40),
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
