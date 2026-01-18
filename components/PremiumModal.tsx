/**
 * PremiumModal - Modal for upgrading to premium subscription
 * Shown when free user tries to save more than 10 articles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSubscription, FREE_ARTICLE_LIMIT } from '../context/SubscriptionContext';
import { ThemeColors } from '../styles/notifTheme';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  articleCount?: number;
}

export default function PremiumModal({
  visible,
  onClose,
  colors,
  articleCount,
}: PremiumModalProps) {
  const { currentOffering, purchasePremium, restorePurchases } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchasePremium();
      if (success) {
        Alert.alert('Success', 'Welcome to Premium! You can now save unlimited articles.');
        onClose();
      }
    } catch (error) {
      console.error('[PremiumModal] Purchase error:', error);
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
        onClose();
      } else {
        Alert.alert('No Subscription', 'No previous subscription found to restore.');
      }
    } catch (error) {
      console.error('[PremiumModal] Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const priceString = currentOffering?.product?.priceString || '$2.00/month';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Premium Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.accent.primary }]}>
            <Icon name="star" size={40} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Upgrade to Premium
          </Text>

          {/* Limit Message */}
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            You've saved {articleCount ?? FREE_ARTICLE_LIMIT} of {FREE_ARTICLE_LIMIT} free articles
          </Text>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <Icon name="checkmark-circle" size={22} color={colors.accent.primary} />
              <Text style={[styles.featureText, { color: colors.text.primary }]}>
                Unlimited article saves
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Icon name="checkmark-circle" size={22} color={colors.accent.primary} />
              <Text style={[styles.featureText, { color: colors.text.primary }]}>
                Support indie development
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Icon name="checkmark-circle" size={22} color={colors.accent.primary} />
              <Text style={[styles.featureText, { color: colors.text.primary }]}>
                Cancel anytime
              </Text>
            </View>
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: colors.accent.primary }]}
            onPress={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                Subscribe for {priceString}
              </Text>
            )}
          </TouchableOpacity>

          {/* Restore Button */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator color={colors.text.secondary} size="small" />
            ) : (
              <Text style={[styles.restoreButtonText, { color: colors.text.secondary }]}>
                Restore Purchases
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
  },
  purchaseButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    fontSize: 14,
  },
});
