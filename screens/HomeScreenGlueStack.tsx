/**
 * Home Screen with GlueStack UI
 * Displays received shared URL and allows saving articles
 */

import React, { useState, useRef } from 'react';
import {
  NativeModules,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  Button,
  ButtonText,
  Input,
  InputField,
  Heading,
} from '@gluestack-ui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { extractAndCreateArticle } from '../services/articleExtractor';
import { saveArticle, getArticleCount, updateArticleWithAiEnhancement } from '../services/database';
import { enhanceArticleContent } from '../services/aiEnhancer';
import { useTheme } from '../context/ThemeContext';

const { SharedIntentModule } = NativeModules;

export default function HomeScreenGlueStack({ navigation }: any) {
  const { getColors } = useTheme();
  const currentColors = getColors();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [articleCount, setArticleCount] = useState(0);
  const [tags, setTags] = useState<string>('');

  // Load article count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadArticleCount();
    }, [])
  );

  const loadArticleCount = async () => {
    try {
      const count = await getArticleCount();
      setArticleCount(count);
    } catch (error) {
      console.error('[HomeScreen] Error loading article count:', error);
    }
  };

  const validateAndSetUrl = (url: string) => {
    if (!url || url.trim() === '') {
      Alert.alert('Error', 'Please enter a valid URL');
      return false;
    }

    let processedUrl = url.trim();
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = 'https://' + processedUrl;
    }

    try {
      new URL(processedUrl);
      setSharedUrl(processedUrl);
      setManualUrl('');
      setIsSaved(false);
      return true;
    } catch (error) {
      Alert.alert('Invalid URL', 'Please enter a valid URL (e.g., https://example.com)');
      return false;
    }
  };

  const handleManualUrlSubmit = () => {
    validateAndSetUrl(manualUrl);
  };

  const handleSaveArticle = async () => {
    if (!sharedUrl) {
      Alert.alert('Error', 'No URL to save');
      return;
    }

    setIsLoading(true);
    try {
      const article = await extractAndCreateArticle(sharedUrl);

      if (tags.trim()) {
        article.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }

      await saveArticle(article);
      setIsSaved(true);
      setTags('');
      loadArticleCount();

      setTimeout(() => {
        navigation.navigate('Library');
      }, 1500);

      // Background AI enhancement
      enhanceArticleContent(article.title, article.content)
        .then(async (enhanced) => {
          if (enhanced) {
            await updateArticleWithAiEnhancement(
              article.id,
              enhanced.summary,
              enhanced.keyPoints,
              enhanced.suggestedTags,
              enhanced.category,
              enhanced.sentiment,
              enhanced.readingTimeMinutes
            );
          }
        })
        .catch((error) => {
          console.warn('[HomeScreen] Background AI enhancement failed:', error);
        });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to save article: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearUrl = () => {
    setSharedUrl(null);
    setIsSaved(false);
    setTags('');
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: currentColors.background }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <Box flex={1} bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark900' } }}>
        <VStack space="lg" p="$6">
          {/* Header */}
          <Box alignItems="center" py="$6" borderBottomWidth={2} borderBottomColor="$primary500">
            <Text style={{ fontSize: 48 }}>↗️</Text>
            <Heading size="3xl" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
              InstaChat
            </Heading>
            <Text size="sm" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }}>
              Share articles to read later
            </Text>
          </Box>

          {sharedUrl ? (
            <VStack space="md" p="$4" bg="$backgroundLight50" borderRadius="$lg" borderWidth={1} borderColor="$borderLight200" sx={{ _dark: { bg: '$backgroundDark900', borderColor: '$borderDark700' } }}>
              <Text size="md" fontWeight="$semibold" color="$textLight900" sx={{ _dark: { color: '$textDark50' } }}>
                Received URL:
              </Text>
              <Box p="$3" bg="$backgroundLight100" borderRadius="$md" borderLeftWidth={4} borderLeftColor="$primary500" sx={{ _dark: { bg: '$backgroundDark800' } }}>
                <Text size="sm" color="$primary600" sx={{ _dark: { color: '$primary400' } }} numberOfLines={3}>
                  {sharedUrl}
                </Text>
              </Box>

              {!isSaved && (
                <VStack space="sm">
                  <Text size="md" fontWeight="$semibold" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
                    Add Tags (optional):
                  </Text>
                  <Input variant="outline" size="md" isDisabled={isLoading}>
                    <InputField
                      placeholder="E.g., tech, reading, important"
                      value={tags}
                      onChangeText={setTags}
                    />
                  </Input>
                </VStack>
              )}

              {!isSaved && (
                <Button
                  onPress={handleSaveArticle}
                  isDisabled={isLoading}
                  action="primary"
                  variant="solid"
                  size="lg"
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <ButtonText>💾 Save Article</ButtonText>
                  )}
                </Button>
              )}

              {isSaved && (
                <Box p="$4" bg="$success100" sx={{ _dark: { bg: '$success900' } }} borderRadius="$md" borderLeftWidth={4} borderLeftColor="$success500">
                  <Text size="md" color="$success700" sx={{ _dark: { color: '$success300' } }} fontWeight="$semibold">
                    ✓ Article saved successfully!
                  </Text>
                </Box>
              )}

              <Button
                onPress={handleClearUrl}
                action="secondary"
                variant="outline"
                size="md"
              >
                <ButtonText>✕ Clear URL</ButtonText>
              </Button>
            </VStack>
          ) : (
            <>
              <Box p="$6" alignItems="center" bg="$backgroundLight50" borderRadius="$lg" borderWidth={1} borderColor="$borderLight200" sx={{ _dark: { bg: '$backgroundDark900', borderColor: '$borderDark700' } }}>
                <Text style={{ fontSize: 64 }}>📥</Text>
                <Heading size="xl" color="$textLight900" textAlign="center" mt="$4" sx={{ _dark: { color: '$textDark50' } }}>
                  Ready to receive shares
                </Heading>
                <Text size="sm" color="$textLight500" textAlign="center" mt="$2" sx={{ _dark: { color: '$textDark400' } }}>
                  Share a URL from Chrome, Safari, or any other app to save it here for reading later.
                </Text>
              </Box>

              <VStack space="md" p="$4" bg="$backgroundLight50" borderRadius="$lg" borderWidth={1} borderColor="$borderLight200" sx={{ _dark: { bg: '$backgroundDark900', borderColor: '$borderDark700' } }}>
                <Text size="md" fontWeight="$semibold" color="$textLight900" sx={{ _dark: { color: '$textDark50' } }}>
                  Or paste a URL manually:
                </Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="Paste URL here (e.g., https://example.com)"
                    value={manualUrl}
                    onChangeText={setManualUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </Input>
                <Button
                  onPress={handleManualUrlSubmit}
                  action="primary"
                  variant="solid"
                  size="md"
                >
                  <ButtonText>📄 Load URL</ButtonText>
                </Button>
              </VStack>
            </>
          )}

          {/* Footer */}
          <Box alignItems="center" py="$6">
            <Text size="sm" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }}>
              {articleCount} articles saved
            </Text>
          </Box>
        </VStack>
      </Box>
    </ScrollView>
  );
}
