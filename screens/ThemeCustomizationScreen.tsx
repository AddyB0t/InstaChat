/**
 * Theme Customization Screen
 * Allows users to customize accent colors and background colors
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import {
  getThemeColors,
  DarkAccent,
  DarkBackground,
  LightAccent,
  LightBackground,
} from '../styles/notifTheme';
import { wp, hp, fp, ms } from '../utils/responsive';

interface ThemeCustomizationScreenProps {
  navigation: any;
}

// Accent color options for dark mode
const darkAccentOptions: { id: DarkAccent; name: string; color: string }[] = [
  { id: 'orange', name: 'Orange', color: '#F97316' },
  { id: 'cyan', name: 'Cyan', color: '#06B6D4' },
  { id: 'lime', name: 'Lime', color: '#84CC16' },
];

// Accent color options for light mode
const lightAccentOptions: { id: LightAccent; name: string; color: string }[] = [
  { id: 'orange', name: 'Orange', color: '#F97316' },
  { id: 'blue', name: 'Blue', color: '#3B82F6' },
  { id: 'green', name: 'Teal', color: '#10B981' },
];

// Background color options for dark mode with swatch colors
const darkBackgroundOptions: { id: DarkBackground; name: string; colors: string[] }[] = [
  { id: 'true-black', name: 'True Black', colors: ['#000000', '#0A0A0A', '#141414'] },
  { id: 'matte-gray', name: 'Matte Gray', colors: ['#1C1C1C', '#252525', '#2E2E2E'] },
  { id: 'midnight', name: 'Midnight', colors: ['#0C1222', '#141C2E', '#1C243A'] },
];

// Background color options for light mode with swatch colors
const lightBackgroundOptions: { id: LightBackground; name: string; colors: string[] }[] = [
  { id: 'pure-white', name: 'Pure White', colors: ['#FFFFFF', '#F0F0F0', '#D8D8D8'] },
  { id: 'soft-gray', name: 'Soft Gray', colors: ['#F5F5F5', '#E0E0E0', '#C8C8C8'] },
  { id: 'ice-blue', name: 'Ice Blue', colors: ['#FFFFFF', '#E9F3FF', '#C9DBF5'] },
];

export const ThemeCustomizationScreen: React.FC<ThemeCustomizationScreenProps> = ({ navigation }) => {
  const { settings, updateTheme, getThemedColors } = useTheme();
  const systemColorScheme = useColorScheme();

  // Get current selections from settings
  const [selectedDarkAccent, setSelectedDarkAccent] = useState<DarkAccent>(
    (settings.darkAccent as DarkAccent) || 'orange'
  );
  const [selectedLightAccent, setSelectedLightAccent] = useState<LightAccent>(
    (settings.lightAccent as LightAccent) || 'orange'
  );
  const [selectedDarkBackground, setSelectedDarkBackground] = useState<DarkBackground>(
    (settings.darkBackground as DarkBackground) || 'true-black'
  );
  const [selectedLightBackground, setSelectedLightBackground] = useState<LightBackground>(
    (settings.lightBackground as LightBackground) || 'pure-white'
  );

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  // Get colors based on current selection for preview
  const previewColors = getThemeColors(isDark, selectedLightAccent, selectedLightBackground, selectedDarkAccent, selectedDarkBackground);
  const colors = getThemedColors(isDark);

  const handleDarkAccentSelect = async (accent: DarkAccent) => {
    setSelectedDarkAccent(accent);
    await updateTheme('darkAccent', accent);
  };

  const handleLightAccentSelect = async (accent: LightAccent) => {
    setSelectedLightAccent(accent);
    await updateTheme('lightAccent', accent);
  };

  const handleDarkBackgroundSelect = async (background: DarkBackground) => {
    setSelectedDarkBackground(background);
    await updateTheme('darkBackground', background);
  };

  const handleLightBackgroundSelect = async (background: LightBackground) => {
    setSelectedLightBackground(background);
    await updateTheme('lightBackground', background);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
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
          Appearance
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Dark Mode Header Card - Tappable to toggle dark/light mode */}
        <TouchableOpacity
          style={[styles.darkModeCard, { backgroundColor: `${colors.accent.primary}40` }]}
          onPress={async () => {
            await updateTheme('theme', isDark ? 'light' : 'dark');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.darkModeIconBox, { backgroundColor: colors.background.tertiary }]}>
            <Icon name={isDark ? 'moon' : 'sunny'} size={ms(24)} color="#FFFFFF" />
          </View>
          <View style={styles.darkModeContent}>
            <Text style={styles.darkModeTitle}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            <Text style={styles.darkModeSubtitle}>
              {isDark ? 'Tap to switch to light mode' : 'Tap to switch to dark mode'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Accent Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIndicator, { backgroundColor: colors.accent.primary }]} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Accent
            </Text>
          </View>

          {isDark ? (
            // Dark mode accents
            darkAccentOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.background.secondary },
                  selectedDarkAccent === option.id && {
                    borderColor: colors.accent.primary,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => handleDarkAccentSelect(option.id)}
              >
                <View style={[styles.colorCircle, { backgroundColor: option.color }]} />
                <Text style={[styles.optionText, { color: colors.text.primary }]}>
                  {option.name}
                </Text>
                {selectedDarkAccent === option.id && (
                  <Icon name="checkmark" size={ms(20)} color={colors.accent.primary} />
                )}
              </TouchableOpacity>
            ))
          ) : (
            // Light mode accents
            lightAccentOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.background.secondary },
                  selectedLightAccent === option.id && {
                    borderColor: colors.accent.primary,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => handleLightAccentSelect(option.id)}
              >
                <View style={[styles.colorCircle, { backgroundColor: option.color }]} />
                <Text style={[styles.optionText, { color: colors.text.primary }]}>
                  {option.name}
                </Text>
                {selectedLightAccent === option.id && (
                  <Icon name="checkmark" size={ms(20)} color={colors.accent.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Background Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Background
          </Text>

          {isDark ? (
            // Dark mode backgrounds
            darkBackgroundOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.background.secondary },
                  selectedDarkBackground === option.id && {
                    borderColor: colors.accent.primary,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => handleDarkBackgroundSelect(option.id)}
              >
                <View style={styles.backgroundSwatch}>
                  {option.colors.map((color: string, index: number) => (
                    <View key={index} style={[styles.swatchBar, { backgroundColor: color }]} />
                  ))}
                </View>
                <Text style={[styles.optionText, { color: colors.text.primary }]}>
                  {option.name}
                </Text>
                {selectedDarkBackground === option.id && (
                  <Icon name="checkmark" size={ms(20)} color={colors.accent.primary} />
                )}
              </TouchableOpacity>
            ))
          ) : (
            // Light mode backgrounds
            lightBackgroundOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.background.secondary },
                  selectedLightBackground === option.id && {
                    borderColor: colors.accent.primary,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => handleLightBackgroundSelect(option.id)}
              >
                <View style={styles.backgroundSwatch}>
                  {option.colors.map((color: string, index: number) => (
                    <View key={index} style={[styles.swatchBar, { backgroundColor: color }]} />
                  ))}
                </View>
                <Text style={[styles.optionText, { color: colors.text.primary }]}>
                  {option.name}
                </Text>
                {selectedLightBackground === option.id && (
                  <Icon name="checkmark" size={ms(20)} color={colors.accent.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Preview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Preview
          </Text>

          <View style={[styles.previewCard, { backgroundColor: previewColors.background.secondary }]}>
            <View style={styles.previewHeader}>
              <View style={[styles.previewIconBox, { backgroundColor: previewColors.accent.primary }]}>
                <Icon name="color-palette" size={ms(18)} color="#FFFFFF" />
              </View>
              <View style={styles.previewHeaderContent}>
                <Text style={[styles.previewTitle, { color: previewColors.text.primary }]}>
                  Theme Preview
                </Text>
                <Text style={[styles.previewSubtitle, { color: previewColors.text.tertiary }]}>
                  This is how your app will look
                </Text>
              </View>
            </View>

            <View style={styles.previewTextContainer}>
              <Text style={[styles.previewPrimaryText, { color: previewColors.text.primary }]}>
                Primary text color
              </Text>
              <Text style={[styles.previewSecondaryText, { color: previewColors.text.secondary }]}>
                Secondary text color
              </Text>
            </View>

            <View style={styles.previewButtonsRow}>
              <View style={[styles.previewButton, { backgroundColor: previewColors.accent.primary }]}>
                <Text style={styles.previewButtonText}>Accent</Text>
              </View>
              <View style={[styles.previewButton, { backgroundColor: previewColors.accent.light }]}>
                <Text style={styles.previewButtonText}>Light</Text>
              </View>
            </View>
          </View>
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
  darkModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(16),
    borderRadius: ms(16),
    marginBottom: hp(24),
  },
  darkModeIconBox: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(14),
  },
  darkModeContent: {
    flex: 1,
  },
  darkModeTitle: {
    fontSize: fp(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  darkModeSubtitle: {
    fontSize: fp(13),
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: hp(2),
  },
  section: {
    marginBottom: hp(24),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(12),
  },
  sectionIndicator: {
    width: wp(4),
    height: hp(20),
    borderRadius: ms(2),
    marginRight: wp(10),
  },
  sectionTitle: {
    fontSize: fp(16),
    fontWeight: '600',
    marginBottom: hp(12),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(16),
    borderRadius: ms(16),
    marginBottom: hp(10),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircle: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    marginRight: wp(14),
  },
  colorSquare: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    marginRight: wp(14),
  },
  backgroundSwatch: {
    width: ms(44),
    height: ms(28),
    borderRadius: ms(6),
    marginRight: wp(14),
    flexDirection: 'row',
    overflow: 'hidden',
    gap: ms(2),
  },
  swatchBar: {
    flex: 1,
    borderRadius: ms(4),
  },
  optionText: {
    flex: 1,
    fontSize: fp(15),
    fontWeight: '500',
  },
  previewCard: {
    padding: wp(16),
    borderRadius: ms(16),
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(16),
  },
  previewIconBox: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(12),
  },
  previewHeaderContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: fp(15),
    fontWeight: '600',
  },
  previewSubtitle: {
    fontSize: fp(12),
    marginTop: hp(2),
  },
  previewTextContainer: {
    marginBottom: hp(16),
  },
  previewPrimaryText: {
    fontSize: fp(14),
    fontWeight: '500',
    marginBottom: hp(4),
  },
  previewSecondaryText: {
    fontSize: fp(13),
  },
  previewButtonsRow: {
    flexDirection: 'row',
    gap: wp(10),
  },
  previewButton: {
    paddingHorizontal: wp(16),
    paddingVertical: hp(8),
    borderRadius: ms(16),
  },
  previewButtonText: {
    fontSize: fp(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ThemeCustomizationScreen;
