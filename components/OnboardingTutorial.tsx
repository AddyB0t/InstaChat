/**
 * OnboardingTutorial Component
 * Floating tooltip-style tutorial with dummy card preview
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { wp, hp, fp, ms, screenWidth } from '../utils/responsive';
import { ThemeColors } from '../styles/notifTheme';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  showCard: boolean;
  highlightFeature?: 'swipe-left' | 'swipe-right' | 'long-press' | 'flip' | 'navbar' | 'none';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to NotiF!',
    description: "Let's learn how to organize your saved articles in just a few steps.",
    showCard: false,
    highlightFeature: 'none',
  },
  {
    id: 'save-articles',
    title: 'Save Articles 2 Ways',
    description: '1. Share from any app - tap the share button and select NotiF\n\n2. Tap the + button in the app to paste a link manually',
    showCard: false,
    highlightFeature: 'none',
  },
  {
    id: 'swipe-left',
    title: 'Swipe Left to Skip',
    description: "Swipe left on cards you're not interested in. They'll be marked as read.",
    showCard: true,
    highlightFeature: 'swipe-left',
  },
  {
    id: 'swipe-right',
    title: 'Swipe Right for Priority',
    description: 'Swipe right to save important articles to your Priority list.',
    showCard: true,
    highlightFeature: 'swipe-right',
  },
  {
    id: 'long-press',
    title: 'Long Press for More',
    description: 'Long-press any card to add taglines, save to folders, or share.',
    showCard: true,
    highlightFeature: 'long-press',
  },
  {
    id: 'flip',
    title: 'Flip for Description',
    description: 'Tap the flip button to add a personal description that helps you remember why you saved it.',
    showCard: true,
    highlightFeature: 'flip',
  },
  {
    id: 'view-modes',
    title: 'Switch Views',
    description: 'Use the bottom bar to switch between Stack, Grid, and Folders view.',
    showCard: false,
    highlightFeature: 'navbar',
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description: 'Start saving your favorite content. Enjoy NotiF!',
    showCard: false,
    highlightFeature: 'none',
  },
];

interface OnboardingTutorialProps {
  visible: boolean;
  onComplete: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
}

export default function OnboardingTutorial({
  visible,
  onComplete,
  colors,
  isDarkMode,
}: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!visible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderDummyCard = () => {
    if (!step.showCard) return null;

    return (
      <View style={styles.cardContainer}>
        {/* Swipe indicators */}
        {step.highlightFeature === 'swipe-left' && (
          <View style={styles.swipeIndicatorLeft}>
            <Icon name="arrow-back" size={24} color="#FF6B6B" />
            <Text style={styles.swipeText}>SKIP</Text>
          </View>
        )}
        {step.highlightFeature === 'swipe-right' && (
          <View style={styles.swipeIndicatorRight}>
            <Text style={styles.swipeText}>SAVE</Text>
            <Icon name="arrow-forward" size={24} color="#4CAF50" />
          </View>
        )}

        {/* Dummy Card */}
        <View style={[
          styles.dummyCard,
          { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
          step.highlightFeature === 'long-press' && styles.cardHighlighted,
          step.highlightFeature === 'flip' && styles.cardHighlighted,
        ]}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.sourceIcon, { backgroundColor: colors.accent.primary }]}>
              <Icon name="globe-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.sourceName, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
                Example Article
              </Text>
              <Text style={[styles.sourceTime, { color: isDarkMode ? '#888888' : '#999999' }]}>
                2 hours ago
              </Text>
            </View>
          </View>

          {/* Card Content */}
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
            How to Build Better Habits and Stick to Them
          </Text>
          <Text style={[styles.cardDescription, { color: isDarkMode ? '#AAAAAA' : '#666666' }]} numberOfLines={2}>
            Learn the science-backed strategies for creating lasting habits that will transform your daily routine...
          </Text>

          {/* Feature highlight overlay */}
          {step.highlightFeature === 'long-press' && (
            <View style={styles.featureOverlay}>
              <Icon name="hand-left" size={32} color={colors.accent.primary} />
              <Text style={[styles.featureText, { color: colors.accent.primary }]}>Hold</Text>
            </View>
          )}
          {step.highlightFeature === 'flip' && (
            <View style={styles.featureOverlay}>
              <Icon name="sync-outline" size={32} color={colors.accent.primary} />
              <Text style={[styles.featureText, { color: colors.accent.primary }]}>Flip</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderNavbarHighlight = () => {
    if (step.highlightFeature !== 'navbar') return null;

    return (
      <View style={styles.navbarPreview}>
        <View style={[styles.navItem, { backgroundColor: isDarkMode ? '#2D2D2D' : '#F0F0F0' }]}>
          <Icon name="grid" size={20} color={isDarkMode ? '#888888' : '#999999'} />
          <Text style={[styles.navLabel, { color: isDarkMode ? '#888888' : '#999999' }]}>Grid</Text>
        </View>
        <View style={[styles.navItem, styles.navItemActive, { backgroundColor: colors.accent.primary }]}>
          <Icon name="layers" size={20} color="#FFFFFF" />
          <Text style={[styles.navLabel, { color: '#FFFFFF' }]}>Stack</Text>
        </View>
        <View style={[styles.navItem, { backgroundColor: isDarkMode ? '#2D2D2D' : '#F0F0F0' }]}>
          <Icon name="folder" size={20} color={isDarkMode ? '#888888' : '#999999'} />
          <Text style={[styles.navLabel, { color: isDarkMode ? '#888888' : '#999999' }]}>Folders</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Semi-transparent backdrop */}
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} pointerEvents="none" />

      {/* Content area */}
      <View style={styles.content} pointerEvents="box-none">
        {/* Dummy Card Preview */}
        {renderDummyCard()}

        {/* Navbar Preview */}
        {renderNavbarHighlight()}

        {/* Tooltip */}
        <View style={[
          styles.tooltip,
          { backgroundColor: isDarkMode ? '#2D2D2D' : '#FFFFFF' },
          step.showCard && styles.tooltipWithCard,
          step.highlightFeature === 'navbar' && styles.tooltipAboveNavbar,
        ]}>
          {/* Arrow pointing up */}
          {step.showCard && (
            <View style={styles.arrowUp}>
              <View style={[styles.arrow, { borderBottomColor: isDarkMode ? '#2D2D2D' : '#FFFFFF' }]} />
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
            {step.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: isDarkMode ? '#B0B0B0' : '#666666' }]}>
            {step.description}
          </Text>

          {/* Footer */}
          <View style={styles.footer}>
            {/* Progress dots */}
            <View style={styles.dotsContainer}>
              {TUTORIAL_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: index === currentStep
                        ? colors.accent.primary
                        : isDarkMode ? '#555555' : '#DDDDDD',
                    },
                  ]}
                />
              ))}
            </View>

            {/* Next button */}
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.accent.primary }]}
              onPress={handleNext}
            >
              <Icon
                name={isLastStep ? "checkmark" : "arrow-forward"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* Skip link */}
          {!isLastStep && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={[styles.skipText, { color: isDarkMode ? '#888888' : '#999999' }]}>
                Skip Tutorial
              </Text>
            </TouchableOpacity>
          )}

          {/* Arrow pointing down (for navbar step) */}
          {step.highlightFeature === 'navbar' && (
            <View style={styles.arrowDown}>
              <View style={[styles.arrow, styles.arrowFlipped, { borderBottomColor: isDarkMode ? '#2D2D2D' : '#FFFFFF' }]} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(20),
  },
  // Card styles
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(20),
  },
  swipeIndicatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(12),
  },
  swipeIndicatorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(12),
  },
  swipeText: {
    color: '#FFFFFF',
    fontSize: fp(12),
    fontWeight: '600',
    marginHorizontal: wp(4),
  },
  dummyCard: {
    width: screenWidth - wp(80),
    borderRadius: ms(16),
    padding: wp(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHighlighted: {
    borderWidth: 2,
    borderColor: '#F97316',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(12),
  },
  sourceIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderText: {
    marginLeft: wp(10),
  },
  sourceName: {
    fontSize: fp(14),
    fontWeight: '600',
  },
  sourceTime: {
    fontSize: fp(12),
  },
  cardTitle: {
    fontSize: fp(16),
    fontWeight: '700',
    marginBottom: hp(8),
  },
  cardDescription: {
    fontSize: fp(14),
    lineHeight: fp(20),
  },
  featureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: fp(14),
    fontWeight: '600',
    marginTop: hp(8),
  },
  // Navbar preview styles
  navbarPreview: {
    flexDirection: 'row',
    gap: wp(12),
    marginBottom: hp(20),
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(10),
    paddingHorizontal: wp(16),
    borderRadius: ms(12),
    gap: wp(6),
  },
  navItemActive: {},
  navLabel: {
    fontSize: fp(13),
    fontWeight: '500',
  },
  // Tooltip styles
  tooltip: {
    width: '100%',
    maxWidth: screenWidth - wp(40),
    borderRadius: ms(16),
    padding: wp(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipWithCard: {
    marginTop: hp(10),
  },
  tooltipAboveNavbar: {
    marginBottom: hp(10),
  },
  title: {
    fontSize: fp(20),
    fontWeight: '700',
    marginBottom: hp(8),
    textAlign: 'center',
  },
  description: {
    fontSize: fp(15),
    lineHeight: fp(22),
    marginBottom: hp(20),
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: wp(6),
  },
  dot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  nextButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    marginTop: hp(16),
    alignSelf: 'center',
  },
  skipText: {
    fontSize: fp(14),
  },
  // Arrow styles
  arrowUp: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
  },
  arrowDown: {
    position: 'absolute',
    bottom: -12,
    alignSelf: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowFlipped: {
    transform: [{ rotate: '180deg' }],
  },
});
