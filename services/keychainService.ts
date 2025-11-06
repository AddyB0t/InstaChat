/**
 * Keychain Service
 * Handles secure storage of API keys using device's encrypted keychain
 */

import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'InstaChat_API_Keys';
const OPENAI_KEY = 'openai_api_key';

/**
 * Save OpenAI API key to encrypted keychain
 */
export const saveOpenAiApiKey = async (apiKey: string): Promise<void> => {
  try {
    console.log('[Keychain] Saving OpenAI API key...');
    await Keychain.setGenericPassword(SERVICE_NAME, apiKey, {
      service: SERVICE_NAME,
      accessibilityAfterFirstUnlock: true,
    });
    console.log('[Keychain] OpenAI API key saved securely');
  } catch (error) {
    console.error('[Keychain] Error saving OpenAI API key:', error);
    throw new Error('Failed to save API key securely');
  }
};

/**
 * Retrieve OpenAI API key from encrypted keychain
 */
export const getOpenAiApiKey = async (): Promise<string | null> => {
  try {
    console.log('[Keychain] Retrieving OpenAI API key...');
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });
    if (credentials) {
      console.log('[Keychain] OpenAI API key retrieved successfully');
      return credentials.password;
    }
    console.log('[Keychain] No OpenAI API key found in keychain');
    return null;
  } catch (error) {
    console.error('[Keychain] Error retrieving OpenAI API key:', error);
    return null;
  }
};

/**
 * Delete OpenAI API key from encrypted keychain
 */
export const deleteOpenAiApiKey = async (): Promise<void> => {
  try {
    console.log('[Keychain] Deleting OpenAI API key...');
    await Keychain.resetGenericPassword({
      service: SERVICE_NAME,
    });
    console.log('[Keychain] OpenAI API key deleted');
  } catch (error) {
    console.error('[Keychain] Error deleting OpenAI API key:', error);
    throw new Error('Failed to delete API key');
  }
};

/**
 * Check if API key exists in keychain
 */
export const hasOpenAiApiKey = async (): Promise<boolean> => {
  try {
    const key = await getOpenAiApiKey();
    return !!key;
  } catch {
    return false;
  }
};
