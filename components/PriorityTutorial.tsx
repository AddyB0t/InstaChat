/**
 * PriorityTutorial Component
 * Floating tooltip-style tutorial for Priority screen with dummy card preview
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { wp, hp, fp, ms, screenWidth } from '../utils/responsive';
import { ThemeColors } from '../styles/notifTheme';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  showCard: boolean;
  highlightFeature?: 'swipe-left' | 'swipe-right' | 'long-press' | 'none';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Priority!',
    description: 'This is where your saved priority articles live. Review and open them here.',
    showCard: false,
    highlightFeature: 'none',
  },
  {
    id: 'swipe-left',
    title: 'Swipe Left to Skip',
    description: 'Swipe left to skip and send the card to the bottom of the stack.',
    showCard: true,
    highlightFeature: 'swipe-left',
  },
  {
    id: 'swipe-right',
    title: 'Swipe Right to Open',
    description: 'Swipe right to open the article in your browser and mark it as read.',
    showCard: true,
    highlightFeature: 'swipe-right',
  },
  {
    id: 'long-press',
    title: 'Long Press for Options',
    description: 'Long-press any card to add taglines, save to folders, or save the entire stack.',
    showCard: true,
    highlightFeature: 'long-press',
  },
  {
    id: 'complete',
    title: "You're Ready!",
    description: 'Start reviewing your priority articles. Happy reading!',
    showCard: false,
    highlightFeature: 'none',
  },
];

interface PriorityTutorialProps {
  visible: boolean;
  onComplete: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
}

export default function PriorityTutorial({
  visible,
  onComplete,
  colors,
  isDarkMode,
}: PriorityTutorialProps) {
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
            <Text style={styles.swipeText}>OPEN</Text>
            <Icon name="arrow-forward" size={24} color="#3B82F6" />
          </View>
        )}

        {/* Dummy Card */}
        <View style={[
          styles.dummyCard,
          { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
          step.highlightFeature === 'long-press' && styles.cardHighlighted,
        ]}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.sourceIcon, { backgroundColor: colors.accent.primary }]}>
              <Icon name="heart" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.sourceName, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
                Priority Article
              </Text>
              <Text style={[styles.sourceTime, { color: isDarkMode ? '#888888' : '#999999' }]}>
                Saved 1 day ago
              </Text>
            </View>
          </View>

          {/* Card Content */}
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
            10 Productivity Tips for Better Focus
          </Text>
          <Text style={[styles.cardDescription, { color: isDarkMode ? '#AAAAAA' : '#666666' }]} numberOfLines={2}>
            Discover proven techniques to improve concentration and get more done in less time...
          </Text>

          {/* Feature highlight overlay */}
          {step.highlightFeature === 'long-press' && (
            <View style={styles.featureOverlay}>
              <Icon name="hand-left" size={32} color={colors.accent.primary} />
              <Text style={[styles.featureText, { color: colors.accent.primary }]}>Hold</Text>
            </View>
          )}
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

        {/* Tooltip */}
        <View style={[
          styles.tooltip,
          { backgroundColor: isDarkMode ? '#2D2D2D' : '#FFFFFF' },
          step.showCard && styles.tooltipWithCard,
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
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
