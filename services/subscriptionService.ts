/**
 * Subscription Service
 * Helper functions for checking subscription before article saves
 */

import { getArticleCount } from './database';

export const FREE_ARTICLE_LIMIT = 10;

export interface CanSaveResult {
  canSave: boolean;
  articleCount: number;
  requiresPremium: boolean;
}

/**
 * Check if user can save more articles based on subscription status
 * @param isPremium - Whether user has premium subscription
 * @returns Object with canSave, articleCount, and requiresPremium flags
 */
export const canSaveArticle = async (isPremium: boolean): Promise<CanSaveResult> => {
  try {
    const articleCount = await getArticleCount();

    // Premium users can always save
    if (isPremium) {
      return {
        canSave: true,
        articleCount,
        requiresPremium: false,
      };
    }

    // Free users limited to FREE_ARTICLE_LIMIT articles
    const canSave = articleCount < FREE_ARTICLE_LIMIT;

    return {
      canSave,
      articleCount,
      requiresPremium: !canSave,
    };
  } catch (error) {
    console.error('[subscriptionService] Error checking save eligibility:', error);
    // On error, allow save to prevent blocking user
    return {
      canSave: true,
      articleCount: 0,
      requiresPremium: false,
    };
  }
};

/**
 * Get remaining free saves for a free user
 * @param isPremium - Whether user has premium subscription
 * @returns Number of remaining saves (Infinity for premium users)
 */
export const getRemainingFreeSaves = async (isPremium: boolean): Promise<number> => {
  if (isPremium) return Infinity;

  try {
    const articleCount = await getArticleCount();
    return Math.max(0, FREE_ARTICLE_LIMIT - articleCount);
  } catch (error) {
    console.error('[subscriptionService] Error getting remaining saves:', error);
    return FREE_ARTICLE_LIMIT;
  }
};
