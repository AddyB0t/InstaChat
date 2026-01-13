/**
 * AddLinkModal - Modal for manually adding article links
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { wp, hp, fp, ms } from '../utils/responsive';
import { saveArticle, updateArticle } from '../services/database';
import { extractAndCreateArticle, enhanceArticleInBackground } from '../services/articleExtractor';
import { useSubscription } from '../context/SubscriptionContext';
import { canSaveArticle, FREE_ARTICLE_LIMIT } from '../services/subscriptionService';

interface AddLinkModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  colors: any;
  onLinkAdded?: () => void;
  onPremiumRequired?: (articleCount: number) => void;
}

export default function AddLinkModal({
  visible,
  onClose,
  isDarkMode,
  colors,
  onLinkAdded,
  onPremiumRequired,
}: AddLinkModalProps) {
  const { isPremium } = useSubscription();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddLink = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      setLoading(true);
      setError('');

      // Check subscription before saving
      const { canSave, articleCount, requiresPremium } = await canSaveArticle(isPremium);
      if (requiresPremium) {
        setLoading(false);
        setError(`You've reached the ${FREE_ARTICLE_LIMIT} article limit. Upgrade to Premium for unlimited saves.`);
        onClose();
        onPremiumRequired?.(articleCount);
        return;
      }

      // Extract article (FAST - no AI)
      const article = await extractAndCreateArticle(formattedUrl);

      // Save immediately
      await saveArticle(article);

      setUrl('');
      onLinkAdded?.();
      onClose();

      // Run AI enhancement in background (non-blocking)
      enhanceArticleInBackground(article).then(async (updates) => {
        if (updates) {
          try {
            await updateArticle(article.id, updates);
            ToastAndroid.show('AI tags added!', ToastAndroid.SHORT);
          } catch (updateError) {
            console.log('[AddLinkModal] Failed to update with AI data:', updateError);
          }
        }
      }).catch((err) => {
        console.log('[AddLinkModal] Background AI enhancement error:', err);
      });

    } catch (err: any) {
      console.error('[AddLinkModal] Error adding link:', err);

      // Check for duplicate article error
      const errorMessage = err?.message || '';
      if (errorMessage.includes('already saved')) {
        setError('This article is already in your library!');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to add link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View
          style={[
            styles.container,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Add Link
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background.tertiary,
                  color: colors.text.primary,
                  borderColor: error ? '#EF4444' : colors.background.tertiary,
                },
              ]}
              placeholder="Enter URL (e.g., https://example.com)"
              placeholderTextColor={colors.text.tertiary}
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                setError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: colors.accent.primary },
              loading && styles.addButtonDisabled,
            ]}
            onPress={handleAddLink}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add to Library</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    padding: wp(20),
    paddingBottom: hp(40),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(20),
  },
  title: {
    fontSize: fp(20),
    fontWeight: '700',
  },
  closeButton: {
    padding: wp(4),
  },
  inputContainer: {
    marginBottom: hp(20),
  },
  input: {
    borderRadius: ms(12),
    padding: wp(16),
    fontSize: fp(16),
    borderWidth: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: fp(12),
    marginTop: hp(8),
    marginLeft: wp(4),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(16),
    borderRadius: ms(14),
    gap: wp(8),
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: fp(16),
    fontWeight: '600',
  },
});
