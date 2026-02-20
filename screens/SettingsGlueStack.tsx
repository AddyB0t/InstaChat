/**
 * Settings Screen with GlueStack UI Components
 * Using GlueStack UI components with built-in styling
 */

import React, { useState } from 'react';
import { Alert, ActivityIndicator, ScrollView } from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Heading,
  Divider,
  Input,
  InputField,
  Pressable,
} from '@gluestack-ui/themed';
import { clearAllArticles, AppSettings, addTagsToAllArticles } from '../services/database';
import { useTheme } from '../context/ThemeContext';
import { testAiConnection } from '../services/aiEnhancer';

const SettingsGlueStack = () => {
  const { settings, updateTheme } = useTheme();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isAddingTags, setIsAddingTags] = useState(false);

  const handleAddTagsToAll = async () => {
    if (!bulkTagInput.trim()) {
      Alert.alert('Error', 'Please enter at least one tag');
      return;
    }

    Alert.alert(
      'Add Tags to All Articles',
      `Add tags "${bulkTagInput}" to all existing articles?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Add Tags',
          onPress: async () => {
            setIsAddingTags(true);
            try {
              const tags = bulkTagInput
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
              const updatedCount = await addTagsToAllArticles(tags);
              setBulkTagInput('');
              Alert.alert('Success', `Tags added to ${updatedCount} articles`);
            } catch (error) {
              Alert.alert('Error', 'Failed to add tags to articles');
            } finally {
              setIsAddingTags(false);
            }
          },
        },
      ]
    );
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testAiConnection();
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Connection Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    try {
      await updateTheme(key, value);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const handleClearData = () => {
    Alert.alert('Clear All Data', 'Are you sure you want to delete all saved articles? This cannot be undone.', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Clear All Data',
        onPress: async () => {
          await clearAllArticles();
          Alert.alert('Success', 'All articles have been deleted');
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Box flex={1} bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark900' } }}>
        <VStack space="lg" p="$6">
          {/* Header */}
          <Heading size="2xl">Settings</Heading>

          {/* APPEARANCE Section */}
          <VStack space="md">
            <Text size="xs" color="$textLight500" fontWeight="$semibold" textTransform="uppercase">
              APPEARANCE
            </Text>

            <VStack space="sm">
              <Text size="md" fontWeight="$medium" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
                Theme
              </Text>
              <HStack space="sm">
                {(['auto', 'light', 'dark'] as const).map((theme) => (
                  <Pressable
                    key={theme}
                    flex={1}
                    onPress={() => updateSetting('theme', theme)}
                    bg={settings.theme === theme ? '$primary500' : '$backgroundLight200'}
                    sx={{ _dark: { bg: settings.theme === theme ? '$primary600' : '$backgroundDark700' } }}
                    p="$3"
                    borderRadius="$md"
                    alignItems="center"
                  >
                    <Text
                      size="sm"
                      fontWeight="$semibold"
                      color={settings.theme === theme ? '$white' : '$textLight900'}
                      sx={{ _dark: { color: settings.theme === theme ? '$white' : '$textDark200' } }}
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </VStack>
          </VStack>

          <Divider />

          {/* READING Section */}
          <VStack space="md">
            <Text size="xs" color="$textLight500" fontWeight="$semibold" textTransform="uppercase">
              READING
            </Text>

            <VStack space="sm">
              <Text size="md" fontWeight="$medium" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
                Font Size
              </Text>
              <HStack space="md" justifyContent="center">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <Pressable
                    key={size}
                    onPress={() => updateSetting('fontSize', size)}
                    bg={settings.fontSize === size ? '$primary500' : '$backgroundLight200'}
                    sx={{ _dark: { bg: settings.fontSize === size ? '$primary600' : '$backgroundDark700' } }}
                    p="$4"
                    borderRadius="$md"
                    w={60}
                    h={60}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text
                      size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md'}
                      fontWeight="$bold"
                      color={settings.fontSize === size ? '$white' : '$textLight900'}
                      sx={{ _dark: { color: settings.fontSize === size ? '$white' : '$textDark200' } }}
                    >
                      A
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </VStack>

            <VStack space="sm">
              <Text size="md" fontWeight="$medium" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
                Font Family
              </Text>
              <HStack space="sm">
                {(['serif', 'sans-serif'] as const).map((font) => (
                  <Pressable
                    key={font}
                    flex={1}
                    onPress={() => updateSetting('fontFamily', font)}
                    bg={settings.fontFamily === font ? '$primary500' : '$backgroundLight200'}
                    sx={{ _dark: { bg: settings.fontFamily === font ? '$primary600' : '$backgroundDark700' } }}
                    p="$3"
                    borderRadius="$md"
                    alignItems="center"
                  >
                    <Text
                      size="sm"
                      fontWeight="$semibold"
                      color={settings.fontFamily === font ? '$white' : '$textLight900'}
                      sx={{ _dark: { color: settings.fontFamily === font ? '$white' : '$textDark200' } }}
                    >
                      {font === 'serif' ? 'Serif' : 'Sans-Serif'}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </VStack>
          </VStack>

          <Divider />

          {/* AI ENHANCEMENT Section */}
          <VStack space="md">
            <Text size="xs" color="$textLight500" fontWeight="$semibold" textTransform="uppercase">
              AI ENHANCEMENT ✨
            </Text>

            <Button
              onPress={handleTestConnection}
              isDisabled={isTestingConnection}
              action="primary"
              variant="solid"
              size="md"
            >
              {isTestingConnection ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <ButtonText>🧪 Test AI Connection</ButtonText>
              )}
            </Button>
          </VStack>

          <Divider />

          {/* BULK TAGS Section */}
          <VStack space="md">
            <Text size="xs" color="$textLight500" fontWeight="$semibold" textTransform="uppercase">
              BULK TAGS
            </Text>

            <VStack space="sm">
              <Text size="md" fontWeight="$medium" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
                Add Tags to All Articles
              </Text>
              <Text size="xs" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }}>
                Add tags to all existing articles at once
              </Text>

              <Input
                variant="outline"
                size="md"
                isDisabled={isAddingTags}
              >
                <InputField
                  placeholder="E.g., tech, reading, important"
                  value={bulkTagInput}
                  onChangeText={setBulkTagInput}
                />
              </Input>

              <Button
                onPress={handleAddTagsToAll}
                isDisabled={isAddingTags}
                action="primary"
                variant="solid"
                size="md"
              >
                {isAddingTags ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <ButtonText>🏷️ Add Tags to All</ButtonText>
                )}
              </Button>
            </VStack>
          </VStack>

          <Divider />

          {/* DATA Section */}
          <VStack space="md">
            <Text size="xs" color="$textLight500" fontWeight="$semibold" textTransform="uppercase">
              DATA
            </Text>

            <Button
              onPress={handleClearData}
              action="negative"
              variant="solid"
              size="md"
            >
              <ButtonText>🗑️ Clear All Data</ButtonText>
            </Button>

            <Text size="xs" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }} textAlign="center">
              This will permanently delete all your saved articles
            </Text>
          </VStack>

          <Divider />

          {/* Footer */}
          <VStack space="xs" alignItems="center" py="$8">
            <Text size="sm" fontWeight="$semibold" color="$textLight900" sx={{ _dark: { color: '$white' } }}>
              NotiF v2.0
            </Text>
            <Text size="xs" color="$textLight500" sx={{ _dark: { color: '$textDark400' } }}>
              A read-it-later app for saving articles
            </Text>
          </VStack>
        </VStack>
      </Box>
    </ScrollView>
  );
};

export default SettingsGlueStack;
