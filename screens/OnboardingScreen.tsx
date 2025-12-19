/**
 * Onboarding Screen
 * 3-slide welcome experience for new users
 * NotiF-style dark theme with orange accents
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Orange accent color matching NotiF
const ACCENT_COLOR = '#F97316';
const ACCENT_LIGHT = '#FDBA74';
const BG_COLOR = '#000000';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9CA3AF';

interface OnboardingSlide {
  id: string;
  type: 'logo' | 'features' | 'welcome';
}

const slides: OnboardingSlide[] = [
  { id: '1', type: 'logo' },
  { id: '2', type: 'features' },
  { id: '3', type: 'welcome' },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    switch (item.type) {
      case 'logo':
        return <LogoSlide />;
      case 'features':
        return <FeaturesSlide />;
      case 'welcome':
        return <WelcomeSlide onGetStarted={onComplete} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Pagination Dots */}
      <View style={[styles.pagination, { paddingBottom: insets.bottom + 40 }]}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? ACCENT_COLOR : TEXT_SECONDARY,
                width: index === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// Slide 1: Logo
function LogoSlide() {
  return (
    <View style={styles.slide}>
      <View style={styles.logoContainer}>
        {/* Logo Icon - Bookmark shape with rounded corners */}
        <View style={styles.logoIcon}>
          <View style={styles.logoInner}>
            <View style={styles.logoNotch} />
          </View>
        </View>
        <Text style={styles.logoText}>NotiF</Text>
        <Text style={styles.logoSubtitle}>BOOKMARK</Text>
      </View>
    </View>
  );
}

// Slide 2: Features
function FeaturesSlide() {
  const features = [
    {
      icon: '⇄',
      title: 'Simple Swipes',
      description: 'Effortlessly sort with intuitive gestures',
    },
    {
      icon: '▣',
      title: 'Smart Organization',
      description: 'Your content, intelligently categorized',
    },
    {
      icon: '⚡',
      title: 'Quick Access',
      description: 'Open bookmarks instantly, right from the app',
    },
  ];

  return (
    <View style={styles.slide}>
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Organize Your Digital{'\n'}Life</Text>

        <View style={styles.featuresList}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// Slide 3: Welcome
function WelcomeSlide({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <View style={styles.slide}>
      <View style={styles.welcomeContainer}>
        {/* Small Logo */}
        <View style={styles.smallLogoIcon}>
          <View style={styles.smallLogoInner}>
            <View style={styles.smallLogoNotch} />
          </View>
        </View>

        <Text style={styles.welcomeTitle}>Welcome to NotiF</Text>
        <Text style={styles.welcomeDescription}>
          Your bookmarks from almost every social{'\n'}media and any website—beautifully{'\n'}organized in one place
        </Text>
      </View>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.getStartedButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={onGetStarted}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Logo Slide
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 100,
    height: 100,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoInner: {
    width: 50,
    height: 60,
    backgroundColor: BG_COLOR,
    borderRadius: 8,
    position: 'relative',
  },
  logoNotch: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ACCENT_COLOR,
  },
  logoText: {
    fontFamily: 'Courier',
    fontSize: 32,
    fontWeight: '900',
    color: ACCENT_COLOR,
    letterSpacing: 3,
  },
  logoSubtitle: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    letterSpacing: 8,
    marginTop: 4,
    textAlign: 'center',
  },

  // Features Slide
  featuresContainer: {
    width: '100%',
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: ACCENT_LIGHT,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 36,
    fontStyle: 'italic',
  },
  featuresList: {
    width: '100%',
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },

  // Welcome Slide
  welcomeContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  smallLogoIcon: {
    width: 80,
    height: 80,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  smallLogoInner: {
    width: 40,
    height: 48,
    backgroundColor: BG_COLOR,
    borderRadius: 6,
    position: 'relative',
  },
  smallLogoNotch: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ACCENT_COLOR,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: ACCENT_LIGHT,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  welcomeDescription: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  getStartedButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: BG_COLOR,
  },
});
