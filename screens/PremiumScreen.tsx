/**
 * PremiumScreen - Full screen for managing subscription
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useSubscription, FREE_ARTICLE_LIMIT } from '../context/SubscriptionContext';
import { getArticleCount } from '../services/database';
import { wp, hp, fp, ms } from '../utils/responsive';

interface PremiumScreenProps {
  navigation: any;
}

export default function PremiumScreen({ navigation }: PremiumScreenProps) {
  const { settings, getThemedColors } = useTheme();
  const { isPremium, currentOffering, purchasePremium, restorePurchases, isLoading: subscriptionLoading } = useSubscription();
  const systemColorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [articleCount, setArticleCount] = useState(0);

  const isDark = settings.theme === 'dark' ||
    (settings.theme === 'auto' && systemColorScheme === 'dark');
  const colors = getThemedColors(isDark);

  useEffect(() => {
    getArticleCount().then(setArticleCount);
  }, []);

  const handlePurchase = async () => {
    // Check if offering is available
    if (!currentOffering) {
      Alert.alert(
        'Not Available',
        'Subscription is not available yet. This may be because:\n\n• The app is still being reviewed\n• Products are not yet configured in App Store Connect\n\nPlease try again later or use the dev mode for testing.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const success = await purchasePremium();
      if (success) {
        Alert.alert('Success', 'Welcome to Premium! You can now save unlimited articles.');
      } else {
        Alert.alert('Purchase Failed', 'The purchase could not be completed. Please try again.');
      }
    } catch (error: any) {
      console.error('[PremiumScreen] Purchase error:', error);
      if (!error.userCancelled) {
        Alert.alert('Error', error.message || 'An error occurred during purchase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Restored', 'Your premium subscription has been restored!');
      } else {
        Alert.alert('No Subscription', 'No previous subscription found to restore.');
      }
    } catch (error) {
      console.error('[PremiumScreen] Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url);
  };

  const priceString = currentOffering?.product?.priceString || '$2.00/month';

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={ms(24)} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Premium</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + hp(20) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.background.secondary }]}>
          <View style={[styles.statusIcon, { backgroundColor: isPremium ? '#22C55E' : colors.accent.primary }]}>
            <Icon name={isPremium ? 'checkmark-circle' : 'star'} size={36} color="#FFFFFF" />
          </View>
          <Text style={[styles.statusTitle, { color: colors.text.primary }]}>
            {isPremium ? 'Premium Active' : 'Free Plan'}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.text.secondary }]}>
            {isPremium
              ? 'Unlimited article saves'
              : `${articleCount}/${FREE_ARTICLE_LIMIT} articles saved`}
          </Text>
        </View>

        {!isPremium && (
          <>
            {/* Features */}
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Premium Features
            </Text>
            <View style={[styles.featuresCard, { backgroundColor: colors.background.secondary }]}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: colors.accent.primary }]}>
                  <Icon name="infinite" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: colors.text.primary }]}>
                    Unlimited Saves
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.text.secondary }]}>
                    Save as many articles as you want
                  </Text>
                </View>
              </View>

              <View style={[styles.featureDivider, { backgroundColor: colors.background.border }]} />

              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: '#22C55E' }]}>
                  <Icon name="heart" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: colors.text.primary }]}>
                    Support Development
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.text.secondary }]}>
                    Help keep NotiF growing
                  </Text>
                </View>
              </View>
            </View>

            {/* Purchase Button */}
            <TouchableOpacity
              style={[styles.purchaseButton, { backgroundColor: colors.accent.primary }]}
              onPress={handlePurchase}
              disabled={loading || subscriptionLoading}
            >
              {loading || subscriptionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="star" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.purchaseButtonText}>Subscribe for {priceString}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Restore */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator color={colors.text.secondary} size="small" />
              ) : (
                <Text style={[styles.restoreText, { color: colors.text.secondary }]}>
                  Restore Purchases
                </Text>
              )}
            </TouchableOpacity>

            {/* Subscription Details & Terms */}
            <Text style={[styles.termsText, { color: colors.text.tertiary }]}>
              NotiF Premium is a monthly subscription at {priceString}. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Payment will be charged to your Apple ID account at confirmation of purchase.
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://docs.google.com/document/d/e/2PACX-1vQbmQDIuHO9qgtJ5kQOoKJyIkCBrieRL3bfrB9QH_7VtpcWhcZiYtEG2UhFWjSSDtER2jVOjIah0YOQ/pub')}>
                <Text style={[styles.legalLinkText, { color: colors.accent.primary }]}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={[styles.legalSeparator, { color: colors.text.tertiary }]}> | </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                <Text style={[styles.legalLinkText, { color: colors.accent.primary }]}>Terms of Use (EULA)</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {isPremium && (
          <>
            {/* Thank you message */}
            <View style={[styles.thankYouCard, { backgroundColor: colors.background.secondary }]}>
              <Icon name="heart" size={24} color={colors.accent.primary} />
              <Text style={[styles.thankYouText, { color: colors.text.primary }]}>
                Thank you for supporting NotiF!
              </Text>
            </View>

            {/* Manage Subscription */}
            <TouchableOpacity
              style={[styles.manageButton, { borderColor: colors.background.border }]}
              onPress={handleManageSubscription}
            >
              <Text style={[styles.manageButtonText, { color: colors.text.primary }]}>
                Manage Subscription
              </Text>
              <Icon name="open-outline" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

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
    padding: wp(16),
  },
  statusCard: {
    borderRadius: ms(20),
    padding: wp(24),
    alignItems: 'center',
    marginBottom: hp(24),
  },
  statusIcon: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(16),
  },
  statusTitle: {
    fontSize: fp(22),
    fontWeight: '700',
    marginBottom: hp(4),
  },
  statusSubtitle: {
    fontSize: fp(14),
  },
  sectionTitle: {
    fontSize: fp(16),
    fontWeight: '600',
    marginBottom: hp(12),
    marginLeft: wp(4),
  },
  featuresCard: {
    borderRadius: ms(16),
    padding: wp(16),
    marginBottom: hp(24),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(8),
  },
  featureIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(14),
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fp(15),
    fontWeight: '500',
  },
  featureDesc: {
    fontSize: fp(12),
    marginTop: hp(2),
  },
  featureDivider: {
    height: 1,
    marginVertical: hp(8),
  },
  purchaseButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(16),
    borderRadius: ms(14),
    marginBottom: hp(16),
  },
  buttonIcon: {
    marginRight: wp(8),
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: fp(16),
    fontWeight: '600',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: hp(12),
    marginBottom: hp(16),
  },
  restoreText: {
    fontSize: fp(14),
  },
  termsText: {
    fontSize: fp(11),
    textAlign: 'center',
    lineHeight: fp(16),
    paddingHorizontal: wp(8),
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(8),
    marginBottom: hp(8),
  },
  legalLinkText: {
    fontSize: fp(12),
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: fp(12),
  },
  thankYouCard: {
    borderRadius: ms(16),
    padding: wp(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(12),
    marginBottom: hp(24),
  },
  thankYouText: {
    fontSize: fp(16),
    fontWeight: '500',
  },
  manageButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(16),
    borderRadius: ms(14),
    borderWidth: 1,
    gap: wp(8),
  },
  manageButtonText: {
    fontSize: fp(16),
    fontWeight: '500',
  },
});
