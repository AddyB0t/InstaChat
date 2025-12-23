/**
 * Sort & Filter Screen
 * Allows users to sort and filter articles by source/platform
 */

import React, { useState, useEffect } from 'react';
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
import { wp, hp, fp, ms } from '../utils/responsive';

interface SortFilterScreenProps {
  navigation: any;
}

type SortOption = 'vintage' | 'new-arrivals';
type PlatformFilter = 'github' | 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'reddit' | 'linkedin' | 'tiktok' | 'snapchat' | 'browser';

const sortOptions: { id: SortOption; name: string; icon: string }[] = [
  { id: 'vintage', name: 'Vintage', icon: 'time-outline' },
  { id: 'new-arrivals', name: 'New Arrivals', icon: 'calendar-outline' },
];

const platformFilters: { id: PlatformFilter; name: string; icon: string; color: string }[] = [
  { id: 'github', name: 'Github', icon: 'logo-github', color: '#333333' },
  { id: 'twitter', name: 'X (Twitter)', icon: 'logo-twitter', color: '#1DA1F2' },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  { id: 'reddit', name: 'Reddit', icon: 'logo-reddit', color: '#FF4500' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  { id: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#000000' },
  { id: 'snapchat', name: 'Snapchat', icon: 'logo-snapchat', color: '#FFFC00' },
  { id: 'browser', name: 'Browser', icon: 'globe-outline', color: '#6366F1' },
];

// Generate month options
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate year options (last 5 years)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export const SortFilterScreen: React.FC<SortFilterScreenProps> = ({ navigation }) => {
  const { settings, updateTheme, getThemedColors } = useTheme();
  const systemColorScheme = useColorScheme();

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');

  const colors = getThemedColors(isDark);

  const [selectedSort, setSelectedSort] = useState<SortOption>(
    (settings.sortBy === 'date' ? 'new-arrivals' : 'vintage') as SortOption
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformFilter[]>(
    settings.platformFilter && settings.platformFilter !== 'all'
      ? [settings.platformFilter as PlatformFilter]
      : []
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    settings.filterMonth !== undefined ? settings.filterMonth : null
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    settings.filterYear !== undefined ? settings.filterYear : null
  );

  const handleSortSelect = async (sort: SortOption) => {
    setSelectedSort(sort);
    await updateTheme('sortBy', sort === 'new-arrivals' ? 'date' : 'random');
  };

  const handlePlatformToggle = async (platform: PlatformFilter) => {
    let newSelected: PlatformFilter[];
    if (selectedPlatforms.includes(platform)) {
      newSelected = selectedPlatforms.filter(p => p !== platform);
    } else {
      newSelected = [...selectedPlatforms, platform];
    }
    setSelectedPlatforms(newSelected);

    // Update settings - if no platforms selected, show all
    if (newSelected.length === 0) {
      await updateTheme('platformFilter', 'all');
    } else if (newSelected.length === 1) {
      await updateTheme('platformFilter', newSelected[0]);
    } else {
      // For multiple platforms, we'll handle this in the filtering logic
      await updateTheme('platformFilter', newSelected.join(','));
    }
  };

  const handleMonthSelect = async (monthIndex: number) => {
    const newMonth = selectedMonth === monthIndex ? null : monthIndex;
    setSelectedMonth(newMonth);
    await updateTheme('filterMonth', newMonth);
  };

  const handleYearSelect = async (year: number) => {
    const newYear = selectedYear === year ? null : year;
    setSelectedYear(newYear);
    await updateTheme('filterYear', newYear);
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
          Sort & Filter
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Sort By Section */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Sort By
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          {sortOptions.map((option, index) => (
            <React.Fragment key={option.id}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => handleSortSelect(option.id)}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.background.tertiary }]}>
                  <Icon name={option.icon} size={ms(20)} color={colors.text.primary} />
                </View>
                <Text style={[styles.optionText, { color: colors.text.primary }]}>
                  {option.name}
                </Text>
                {selectedSort === option.id && (
                  <Icon name="checkmark" size={ms(20)} color={colors.accent.primary} />
                )}
              </TouchableOpacity>
              {index < sortOptions.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Filter by Source Section */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Filter by Source
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.text.tertiary }]}>
          Select one or more sources to filter
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary }]}>
          {platformFilters.map((platform, index) => (
            <React.Fragment key={platform.id}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => handlePlatformToggle(platform.id)}
              >
                <View style={[styles.platformIcon, { backgroundColor: platform.color }]}>
                  <Icon name={platform.icon} size={ms(18)} color="#FFFFFF" />
                </View>
                <Text style={[styles.optionText, { color: colors.text.primary }]}>
                  {platform.name}
                </Text>
                {selectedPlatforms.includes(platform.id) && (
                  <Icon name="checkmark" size={ms(20)} color={colors.accent.primary} />
                )}
              </TouchableOpacity>
              {index < platformFilters.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Filter by Month Section */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Filter by Month
        </Text>
        <View style={styles.chipContainer}>
          {months.map((month, index) => (
            <TouchableOpacity
              key={month}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedMonth === index
                    ? colors.accent.primary
                    : colors.background.secondary,
                }
              ]}
              onPress={() => handleMonthSelect(index)}
            >
              <Text style={[
                styles.chipText,
                {
                  color: selectedMonth === index
                    ? '#FFFFFF'
                    : colors.text.primary,
                }
              ]}>
                {month.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter by Year Section */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Filter by Year
        </Text>
        <View style={styles.chipContainer}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.chip,
                styles.yearChip,
                {
                  backgroundColor: selectedYear === year
                    ? colors.accent.primary
                    : colors.background.secondary,
                }
              ]}
              onPress={() => handleYearSelect(year)}
            >
              <Text style={[
                styles.chipText,
                {
                  color: selectedYear === year
                    ? '#FFFFFF'
                    : colors.text.primary,
                }
              ]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Clear Filters Button */}
        {(selectedPlatforms.length > 0 || selectedMonth !== null || selectedYear !== null) && (
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: colors.accent.primary }]}
            onPress={async () => {
              setSelectedPlatforms([]);
              setSelectedMonth(null);
              setSelectedYear(null);
              await updateTheme('platformFilter', 'all');
              await updateTheme('filterMonth', null);
              await updateTheme('filterYear', null);
            }}
          >
            <Text style={[styles.clearButtonText, { color: colors.accent.primary }]}>
              Clear All Filters
            </Text>
          </TouchableOpacity>
        )}
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
  sectionTitle: {
    fontSize: fp(14),
    fontWeight: '600',
    marginTop: hp(20),
    marginBottom: hp(8),
    marginLeft: wp(4),
  },
  sectionSubtitle: {
    fontSize: fp(12),
    marginBottom: hp(12),
    marginLeft: wp(4),
  },
  sectionCard: {
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(14),
    paddingHorizontal: wp(14),
  },
  iconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(14),
  },
  platformIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(14),
  },
  optionText: {
    flex: 1,
    fontSize: fp(15),
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    marginLeft: wp(64),
  },
  clearButton: {
    marginTop: hp(24),
    paddingVertical: hp(14),
    borderRadius: ms(12),
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: fp(15),
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(8),
    marginBottom: hp(8),
  },
  chip: {
    paddingHorizontal: wp(14),
    paddingVertical: hp(10),
    borderRadius: ms(12),
    minWidth: wp(60),
    alignItems: 'center',
  },
  yearChip: {
    minWidth: wp(70),
  },
  chipText: {
    fontSize: fp(13),
    fontWeight: '600',
  },
});

export default SortFilterScreen;
