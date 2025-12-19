/**
 * Bundle Service
 * Manages temporary article bundles created by swiping up
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bundle } from './database';

const BUNDLES_KEY = 'instachat_bundles';
const CURRENT_BUNDLE_KEY = 'instachat_current_bundle';

/**
 * Get all bundles
 */
export const getAllBundles = async (): Promise<Bundle[]> => {
  try {
    const bundlesJson = await AsyncStorage.getItem(BUNDLES_KEY);
    if (!bundlesJson) {
      return [];
    }
    return JSON.parse(bundlesJson);
  } catch (error) {
    console.error('[BundleService] Error getting bundles:', error);
    return [];
  }
};

/**
 * Get current active bundle (the one being built)
 */
export const getCurrentBundle = async (): Promise<Bundle | null> => {
  try {
    const bundleJson = await AsyncStorage.getItem(CURRENT_BUNDLE_KEY);
    if (!bundleJson) {
      return null;
    }
    return JSON.parse(bundleJson);
  } catch (error) {
    console.error('[BundleService] Error getting current bundle:', error);
    return null;
  }
};

/**
 * Create a new bundle (or get existing current bundle)
 */
export const createBundle = async (): Promise<Bundle> => {
  try {
    // Check if there's already an active bundle
    const existingBundle = await getCurrentBundle();
    if (existingBundle) {
      return existingBundle;
    }

    // Create new bundle
    const newBundle: Bundle = {
      id: `bundle_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      articleIds: [],
      createdAt: new Date().toISOString(),
      temporary: true,
    };

    await AsyncStorage.setItem(CURRENT_BUNDLE_KEY, JSON.stringify(newBundle));
    console.log('[BundleService] Created new bundle:', newBundle.id);
    return newBundle;
  } catch (error) {
    console.error('[BundleService] Error creating bundle:', error);
    throw error;
  }
};

/**
 * Add article to current bundle
 */
export const addArticleToBundle = async (articleId: string): Promise<Bundle> => {
  try {
    let bundle = await getCurrentBundle();

    // Create bundle if it doesn't exist
    if (!bundle) {
      bundle = await createBundle();
    }

    // Don't add duplicates
    if (!bundle.articleIds.includes(articleId)) {
      bundle.articleIds.push(articleId);
      await AsyncStorage.setItem(CURRENT_BUNDLE_KEY, JSON.stringify(bundle));
      console.log('[BundleService] Added article to bundle:', articleId);
    }

    return bundle;
  } catch (error) {
    console.error('[BundleService] Error adding article to bundle:', error);
    throw error;
  }
};

/**
 * Remove article from current bundle
 */
export const removeArticleFromBundle = async (articleId: string): Promise<Bundle | null> => {
  try {
    const bundle = await getCurrentBundle();
    if (!bundle) {
      return null;
    }

    bundle.articleIds = bundle.articleIds.filter(id => id !== articleId);
    await AsyncStorage.setItem(CURRENT_BUNDLE_KEY, JSON.stringify(bundle));
    console.log('[BundleService] Removed article from bundle:', articleId);

    return bundle;
  } catch (error) {
    console.error('[BundleService] Error removing article from bundle:', error);
    return null;
  }
};

/**
 * Save current bundle to permanent storage
 */
export const saveCurrentBundle = async (): Promise<void> => {
  try {
    const currentBundle = await getCurrentBundle();
    if (!currentBundle || currentBundle.articleIds.length === 0) {
      console.log('[BundleService] No bundle to save or bundle is empty');
      return;
    }

    const allBundles = await getAllBundles();
    allBundles.unshift(currentBundle);
    await AsyncStorage.setItem(BUNDLES_KEY, JSON.stringify(allBundles));

    // Clear current bundle
    await AsyncStorage.removeItem(CURRENT_BUNDLE_KEY);
    console.log('[BundleService] Saved bundle:', currentBundle.id);
  } catch (error) {
    console.error('[BundleService] Error saving bundle:', error);
    throw error;
  }
};

/**
 * Clear current bundle without saving
 */
export const clearCurrentBundle = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CURRENT_BUNDLE_KEY);
    console.log('[BundleService] Cleared current bundle');
  } catch (error) {
    console.error('[BundleService] Error clearing bundle:', error);
  }
};

/**
 * Get bundle by ID
 */
export const getBundleById = async (bundleId: string): Promise<Bundle | null> => {
  try {
    const allBundles = await getAllBundles();
    return allBundles.find(b => b.id === bundleId) || null;
  } catch (error) {
    console.error('[BundleService] Error getting bundle by ID:', error);
    return null;
  }
};

/**
 * Delete bundle
 */
export const deleteBundle = async (bundleId: string): Promise<void> => {
  try {
    const allBundles = await getAllBundles();
    const filteredBundles = allBundles.filter(b => b.id !== bundleId);
    await AsyncStorage.setItem(BUNDLES_KEY, JSON.stringify(filteredBundles));
    console.log('[BundleService] Deleted bundle:', bundleId);
  } catch (error) {
    console.error('[BundleService] Error deleting bundle:', error);
    throw error;
  }
};

/**
 * Get bundle article count
 */
export const getBundleArticleCount = async (): Promise<number> => {
  try {
    const bundle = await getCurrentBundle();
    return bundle ? bundle.articleIds.length : 0;
  } catch (error) {
    console.error('[BundleService] Error getting bundle count:', error);
    return 0;
  }
};

/**
 * Check if article is in current bundle
 */
export const isArticleInBundle = async (articleId: string): Promise<boolean> => {
  try {
    const bundle = await getCurrentBundle();
    return bundle ? bundle.articleIds.includes(articleId) : false;
  } catch (error) {
    console.error('[BundleService] Error checking if article in bundle:', error);
    return false;
  }
};
