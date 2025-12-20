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
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Orange accent color matching NotiF
const ACCENT_COLOR = '#F97316';
const ACCENT_LIGHT = '#FDBA74';
const ACCENT_DARK = '#EA580C';
const BG_COLOR = '#000000';
const BG_SECONDARY = '#0A0A0A';
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
                backgroundColor: index === currentIndex ? ACCENT_COLOR : 'rgba(255,255,255,0.3)',
                width: index === currentIndex ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// App Icon Logo Component - matches the actual app icon
function AppIconLogo({ size = 120 }: { size?: number }) {
  const iconSize = size;
  const bookmarkWidth = size * 0.45;
  const bookmarkHeight = size * 0.55;
  const notchSize = size * 0.12;
  const borderRadius = size * 0.22;
  const innerRadius = size * 0.08;

  return (
    <View style={[styles.appIconContainer, {
      width: iconSize,
      height: iconSize,
      borderRadius: borderRadius,
    }]}>
      {/* Dark background */}
      <View style={[styles.appIconBg, {
        width: iconSize,
        height: iconSize,
        borderRadius: borderRadius,
      }]}>
        {/* Orange bookmark shape */}
        <View style={[styles.bookmarkShape, {
          width: bookmarkWidth,
          height: bookmarkHeight,
          borderTopLeftRadius: innerRadius,
          borderTopRightRadius: innerRadius,
        }]}>
          {/* Notch cutout at bottom */}
          <View style={[styles.bookmarkNotch, {
            borderLeftWidth: bookmarkWidth / 2,
            borderRightWidth: bookmarkWidth / 2,
            borderBottomWidth: notchSize,
          }]} />
        </View>
      </View>
    </View>
  );
}

// Slide 1: Logo
function LogoSlide() {
  return (
    <View style={styles.slide}>
      {/* Background glow effect */}
      <View style={styles.glowContainer}>
        <LinearGradient
          colors={['rgba(249, 115, 22, 0.15)', 'rgba(249, 115, 22, 0.05)', 'transparent']}
          style={styles.glowGradient}
        />
      </View>

      <View style={styles.logoContainer}>
        {/* App Icon Logo with shadow */}
        <View style={styles.logoShadow}>
          <AppIconLogo size={130} />
        </View>

        <Text style={styles.logoText}>NotiF</Text>
        <Text style={styles.logoSubtitle}>BOOKMARK</Text>
      </View>

      {/* Swipe hint */}
      <View style={styles.swipeHint}>
        <Icon name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        <Icon name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: -8 }} />
        <Icon name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" style={{ marginLeft: -8 }} />
      </View>
    </View>
  );
}

// Slide 2: Features
function FeaturesSlide() {
  const features = [
    {
      icon: 'swap-horizontal',
      title: 'Simple Swipes',
      description: 'Effortlessly sort with intuitive gestures',
    },
    {
      icon: 'grid',
      title: 'Smart Organization',
      description: 'Your content, intelligently categorized',
    },
    {
      icon: 'flash',
      title: 'Quick Access',
      description: 'Open bookmarks instantly from the app',
    },
  ];

  return (
    <View style={styles.slide}>
      {/* Background glow */}
      <View style={styles.glowContainer}>
        <LinearGradient
          colors={['rgba(249, 115, 22, 0.1)', 'transparent']}
          style={styles.glowGradientSmall}
        />
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Organize Your</Text>
        <Text style={styles.featuresTitleAccent}>Digital Life</Text>

        <View style={styles.featuresList}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <LinearGradient
                colors={[ACCENT_COLOR, ACCENT_DARK]}
                style={styles.featureIconContainer}
              >
                <Icon name={feature.icon} size={22} color="#FFFFFF" />
              </LinearGradient>
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
      {/* Background glow */}
      <View style={styles.glowContainer}>
        <LinearGradient
          colors={['rgba(249, 115, 22, 0.12)', 'transparent']}
          style={styles.glowGradientSmall}
        />
      </View>

      <View style={styles.welcomeContainer}>
        {/* App Icon Logo with shadow */}
        <View style={styles.smallLogoShadow}>
          <AppIconLogo size={100} />
        </View>

        <Text style={styles.welcomeTitle}>Welcome to NotiF</Text>
        <Text style={styles.welcomeDescription}>
          Your bookmarks from almost every social{'\n'}media and any website—beautifully{'\n'}organized in one place.
        </Text>
      </View>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.getStartedButtonWrapper,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          onPress={onGetStarted}
        >
          <LinearGradient
            colors={[ACCENT_COLOR, ACCENT_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.getStartedButton}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
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

  // Background glow
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowGradient: {
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
    borderRadius: SCREEN_WIDTH * 0.6,
    opacity: 0.8,
  },
  glowGradientSmall: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    borderRadius: SCREEN_WIDTH * 0.5,
    opacity: 0.6,
  },

  // App Icon Logo styles
  appIconContainer: {
    overflow: 'hidden',
  },
  appIconBg: {
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bookmarkShape: {
    backgroundColor: ACCENT_COLOR,
    position: 'relative',
  },
  bookmarkNotch: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1A1A1A',
  },

  // Logo Slide
  logoContainer: {
    alignItems: 'center',
  },
  logoShadow: {
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
    marginBottom: 28,
  },
  logoText: {
    fontFamily: 'Courier',
    fontSize: 42,
    fontWeight: '900',
    color: ACCENT_COLOR,
    letterSpacing: 4,
  },
  logoSubtitle: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Features Slide
  featuresContainer: {
    width: '100%',
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: 1,
  },
  featuresTitleAccent: {
    fontSize: 32,
    fontWeight: '800',
    color: ACCENT_COLOR,
    textAlign: 'center',
    marginBottom: 48,
    letterSpacing: 1,
  },
  featuresList: {
    width: '100%',
    gap: 28,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
  },

  // Welcome Slide
  welcomeContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  smallLogoShadow: {
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 36,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '300',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  welcomeDescription: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 10,
    paddingBottom: 110,
  },
  getStartedButtonWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  getStartedButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
