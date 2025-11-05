/**
 * Local SQLite Database Service
 * Handles article storage, retrieval, and management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Article {
  id: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  savedAt: string;
  summary?: string;
  imageUrl?: string;
}

const ARTICLES_KEY = 'instachat_articles';

/**
 * Save article to local storage
 */
export const saveArticle = async (article: Article): Promise<void> => {
  try {
    const existingArticles = await getAllArticles();

    // Check if article already exists
    const exists = existingArticles.some(a => a.id === article.id);
    if (exists) {
      throw new Error('Article already saved');
    }

    // Add to storage
    const updated = [article, ...existingArticles];
    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(updated));

    console.log('[Database] Article saved:', article.id);
  } catch (error) {
    console.error('[Database] Error saving article:', error);
    throw error;
  }
};

/**
 * Get all saved articles
 */
export const getAllArticles = async (): Promise<Article[]> => {
  try {
    const data = await AsyncStorage.getItem(ARTICLES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[Database] Error getting articles:', error);
    return [];
  }
};

/**
 * Get single article by ID
 */
export const getArticle = async (id: string): Promise<Article | null> => {
  try {
    const articles = await getAllArticles();
    return articles.find(a => a.id === id) || null;
  } catch (error) {
    console.error('[Database] Error getting article:', error);
    return null;
  }
};

/**
 * Delete article
 */
export const deleteArticle = async (id: string): Promise<void> => {
  try {
    const articles = await getAllArticles();
    const filtered = articles.filter(a => a.id !== id);
    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(filtered));
    console.log('[Database] Article deleted:', id);
  } catch (error) {
    console.error('[Database] Error deleting article:', error);
    throw error;
  }
};

/**
 * Search articles by title or content
 */
export const searchArticles = async (query: string): Promise<Article[]> => {
  try {
    const articles = await getAllArticles();
    const lowercaseQuery = query.toLowerCase();

    return articles.filter(a =>
      a.title.toLowerCase().includes(lowercaseQuery) ||
      a.content.toLowerCase().includes(lowercaseQuery)
    );
  } catch (error) {
    console.error('[Database] Error searching articles:', error);
    return [];
  }
};

/**
 * Update article
 */
export const updateArticle = async (id: string, updates: Partial<Article>): Promise<Article | null> => {
  try {
    const articles = await getAllArticles();
    const index = articles.findIndex(a => a.id === id);

    if (index === -1) {
      throw new Error('Article not found');
    }

    const updated = { ...articles[index], ...updates };
    articles[index] = updated;

    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    console.log('[Database] Article updated:', id);

    return updated;
  } catch (error) {
    console.error('[Database] Error updating article:', error);
    throw error;
  }
};

/**
 * Get article count
 */
export const getArticleCount = async (): Promise<number> => {
  try {
    const articles = await getAllArticles();
    return articles.length;
  } catch (error) {
    console.error('[Database] Error getting article count:', error);
    return 0;
  }
};

/**
 * Clear all articles
 */
export const clearAllArticles = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ARTICLES_KEY);
    console.log('[Database] All articles cleared');
  } catch (error) {
    console.error('[Database] Error clearing articles:', error);
    throw error;
  }
};
