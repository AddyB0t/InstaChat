/**
 * SettingsNewScreen
 * NotiF-style settings matching reference design
 */

import React, { useState } from 'react';
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
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { ThemeColors } from '../styles/notifTheme';
import { wp, hp, fp, ms } from '../utils/responsive';
import Haptic from '../services/hapticService';

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
  const { settings, updateTheme, updateSettings, getThemedColors } = useTheme();
  const { isPremium, isDevMode, enableDevMode, disableDevMode } = useSubscription();
  const systemColorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [showDevModal, setShowDevModal] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  const colors = getThemedColors(isDark);

  const handleThemePress = () => {
    Haptic.light();
    navigation.navigate('ThemeCustomization');
  };

  const handlePremiumPress = () => {
    Haptic.light();
    navigation.navigate('Premium');
  };

  const handleVersionPress = () => {
    if (isDevMode) {
      // Already in dev mode, ask to disable
      Alert.alert(
        'Dev Mode Active',
        'You have developer access. Disable dev mode?',
        [
          { text: 'Keep Active', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: async () => {
            await disableDevMode();
            Alert.alert('Dev Mode Disabled', 'Premium features are now locked.');
          }},
        ]
      );
    } else {
      const now = Date.now();
      // Reset tap count if more than 2 seconds since last tap
      if (now - lastTapTime > 2000) {
        setTapCount(1);
      } else {
        const newCount = tapCount + 1;
        setTapCount(newCount);

        if (newCount >= 5) {
          // Show password modal after 5 taps
          setTapCount(0);
          setDevPassword('');
          setShowDevModal(true);
        }
      }
      setLastTapTime(now);
    }
  };

  const handleDevPasswordSubmit = async () => {
    const success = await enableDevMode(devPassword);
    setShowDevModal(false);
    setDevPassword('');
    if (success) {
      Haptic.success();
      Alert.alert('Dev Mode Enabled', 'All premium features are now unlocked!');
    } else {
      Haptic.error();
      Alert.alert('Invalid Password', 'The password you entered is incorrect.');
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    Haptic.selection();
    updateTheme('theme', value ? 'dark' : 'light');
  };

  const handleSortFilterPress = () => {
    Haptic.light();
    navigation.navigate('SortFilter');
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

  const handleResetHomeTutorial = async () => {
    Haptic.light();
    await updateSettings({ hasCompletedOnboarding: false });
    Alert.alert('Tutorial Reset', 'Home screen tutorial will show on next visit.');
  };

  const handleResetPriorityTutorial = async () => {
    Haptic.light();
    await updateSettings({ hasCompletedPriorityTutorial: false });
    Alert.alert('Tutorial Reset', 'Priority screen tutorial will show on next visit.');
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + hp(80) }]}
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
            iconName="funnel"
            iconBgColor={colors.accent.primary}
            title="Sort & Filter"
            subtitle="Organize your articles"
            onPress={handleSortFilterPress}
            colors={colors}
          />
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" colors={colors} />
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          <SettingRow
            iconName="star"
            iconBgColor={isPremium ? '#22C55E' : '#F59E0B'}
            title={isPremium ? 'Premium Active' : 'Upgrade to Premium'}
            subtitle={isPremium ? 'Unlimited article saves' : 'Save unlimited articles'}
            onPress={handlePremiumPress}
            colors={colors}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            iconName="log-out-outline"
            iconBgColor="#EF4444"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            colors={colors}
          />
        </View>

        {/* Tutorial Section */}
        <SectionHeader title="Tutorial" colors={colors} />
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          <SettingRow
            iconName="play-circle-outline"
            iconBgColor="#22C55E"
            title="Reset Home Tutorial"
            subtitle="Show the bookmark tutorial again"
            onPress={handleResetHomeTutorial}
            colors={colors}
          />
          <SettingRow
            iconName="star-outline"
            iconBgColor="#F59E0B"
            title="Reset Priority Tutorial"
            subtitle="Show the priority tutorial again"
            onPress={handleResetPriorityTutorial}
            colors={colors}
          />
        </View>

        {/* Legal Section */}
        <SectionHeader title="Legal" colors={colors} />
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          <SettingRow
            iconName="document-text-outline"
            iconBgColor="#6B7280"
            title="Privacy Policy"
            subtitle="View our privacy policy"
            onPress={() => Linking.openURL('https://docs.google.com/document/d/e/2PACX-1vQbmQDIuHO9qgtJ5kQOoKJyIkCBrieRL3bfrB9QH_7VtpcWhcZiYtEG2UhFWjSSDtER2jVOjIah0YOQ/pub')}
            colors={colors}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            iconName="reader-outline"
            iconBgColor="#6B7280"
            title="Terms of Use"
            subtitle="Apple Standard EULA"
            onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
            colors={colors}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleVersionPress} activeOpacity={0.7}>
            <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
              NotiF v1.0.0 {isDevMode ? '(Dev)' : ''}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.footerSubtext, { color: colors.text.tertiary }]}>
            Save it. Swipe it. Read it later.
          </Text>
        </View>
      </ScrollView>

      {/* Dev Mode Password Modal */}
      <Modal
        visible={showDevModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDevModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Developer Access
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
              Enter password to unlock dev mode
            </Text>
            <TextInput
              style={[styles.passwordInput, {
                backgroundColor: colors.background.tertiary,
                color: colors.text.primary,
                borderColor: colors.background.tertiary,
              }]}
              placeholder="Password"
              placeholderTextColor={colors.text.tertiary}
              value={devPassword}
              onChangeText={setDevPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.background.tertiary }]}
                onPress={() => {
                  setShowDevModal(false);
                  setDevPassword('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.accent.primary }]}
                onPress={handleDevPasswordSubmit}
              >
                <Text style={styles.submitButtonText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  footer: {
    alignItems: 'center',
    paddingTop: hp(20),
    paddingBottom: hp(10),
  },
  footerText: {
    fontSize: fp(14),
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: fp(12),
    marginTop: hp(4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(20),
  },
  modalContent: {
    width: '100%',
    borderRadius: ms(16),
    padding: wp(24),
  },
  modalTitle: {
    fontSize: fp(20),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: hp(8),
  },
  modalSubtitle: {
    fontSize: fp(14),
    textAlign: 'center',
    marginBottom: hp(20),
  },
  passwordInput: {
    borderRadius: ms(12),
    padding: wp(16),
    fontSize: fp(16),
    borderWidth: 1,
    marginBottom: hp(20),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: wp(12),
  },
  modalButton: {
    flex: 1,
    paddingVertical: hp(14),
    borderRadius: ms(12),
    alignItems: 'center',
  },
  cancelButton: {},
  submitButton: {},
  cancelButtonText: {
    fontSize: fp(16),
    fontWeight: '600',
  },
  submitButtonText: {
    fontSize: fp(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
