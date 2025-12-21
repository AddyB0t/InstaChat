/**
 * Local SQLite Database Service
 * Handles article storage, retrieval, and management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlatformType } from '../styles/platformColors';

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
  folderId?: string;
  tags?: string[];
  isUnread?: boolean;
  isFavorite?: boolean;
  isBookmarked?: boolean;

  // Platform Fields
  platform?: PlatformType;
  platformColor?: string;

  // Bundle Fields
  bundleId?: string;

  // AI Enhancement Fields
  aiEnhanced?: boolean;
  aiSummary?: string;
  aiKeyPoints?: string[];
  aiTags?: string[];
  aiCategory?: string;
  aiSentiment?: 'positive' | 'neutral' | 'negative';
  readingTimeMinutes?: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  articleCount: number;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  articleCount: number;
}

export interface Bundle {
  id: string;
  articleIds: string[];
  createdAt: string;
  temporary: boolean; // Auto-clears after viewing
}

export interface AppSettings {
  theme: 'auto' | 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'serif' | 'sans-serif';
  defaultView: 'all' | 'unread';
  platformFilter?: PlatformType | 'all'; // Platform filter setting
  sortBy?: 'random' | 'date' | 'platform'; // Sort preference
  // Dark mode customization
  darkAccent?: 'orange' | 'cyan' | 'lime';
  darkBackground?: 'true-black' | 'matte-gray' | 'midnight';
  // Light mode customization
  lightAccent?: 'orange' | 'blue' | 'green';
  lightBackground?: 'pure-white' | 'soft-gray' | 'ice-blue';
}

const ARTICLES_KEY = 'instachat_articles';
const FOLDERS_KEY = 'instachat_folders';
const TAGS_KEY = 'instachat_tags';
const SETTINGS_KEY = 'instachat_settings';

/**
 * Save article to local storage
 */
export const saveArticle = async (article: Article): Promise<void> => {
  try {
    console.log('[Database] saveArticle called for article ID:', article.id);
    console.log('[Database] Article URL:', article.url);
    console.log('[Database] Article title:', article.title);

    const existingArticles = await getAllArticles();
    console.log('[Database] Total existing articles:', existingArticles.length);

    // Check if article with same ID already exists
    const existsById = existingArticles.some(a => a.id === article.id);
    if (existsById) {
      const errMsg = 'Article with this ID already saved';
      console.error('[Database] ' + errMsg);
      throw new Error(errMsg);
    }

    // Check if article with same URL already exists (prevent duplicates)
    const existsByUrl = existingArticles.find(a => a.url === article.url);
    if (existsByUrl) {
      const errMsg = `Article from this URL already saved (ID: ${existsByUrl.id})`;
      console.warn('[Database] ' + errMsg);
      throw new Error(errMsg);
    }

    console.log('[Database] No duplicates found, proceeding to save...');

    // Add to storage
    const updated = [article, ...existingArticles];
    console.log('[Database] Total articles after save:', updated.length);

    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(updated));
    console.log('[Database] Article saved successfully to AsyncStorage:', article.id);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Database] Error saving article:');
    console.error('[Database] Error message:', errorMessage);
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
export const deleteArticle = async (id: string | number): Promise<void> => {
  try {
    const articles = await getAllArticles();
    const idStr = String(id);
    const filtered = articles.filter(a => String(a.id) !== idStr);
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
export const updateArticle = async (id: string | number, updates: Partial<Article>): Promise<Article | null> => {
  try {
    const articles = await getAllArticles();
    // Convert to string for comparison (handle both string and number IDs)
    const idStr = String(id);
    const index = articles.findIndex(a => String(a.id) === idStr);

    if (index === -1) {
      console.error('[Database] Article not found for ID:', id);
      throw new Error('Article not found');
    }

    const updated = { ...articles[index], ...updates };
    articles[index] = updated;

    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    console.log('[Database] Article updated:', id, 'Updates:', Object.keys(updates));

    return updated;
  } catch (error) {
    console.error('[Database] Error updating article:', error);
    throw error;
  }
};

/**
 * Update article with AI enhancement results
 */
export const updateArticleWithAiEnhancement = async (
  id: string,
  aiSummary: string,
  aiKeyPoints: string[],
  aiTags: string[],
  aiCategory: string,
  aiSentiment: 'positive' | 'neutral' | 'negative',
  readingTimeMinutes: number,
  platform?: PlatformType,
  platformColor?: string
): Promise<Article | null> => {
  try {
    console.log('[Database] Updating article with AI enhancement:', id);
    return await updateArticle(id, {
      aiEnhanced: true,
      aiSummary,
      aiKeyPoints,
      aiTags,
      aiCategory,
      aiSentiment,
      readingTimeMinutes,
      platform,
      platformColor,
    });
  } catch (error) {
    console.error('[Database] Error updating article with AI enhancement:', error);
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

// ===== FOLDERS =====

export const createFolder = async (name: string): Promise<Folder> => {
  try {
    const folders = await getAllFolders();
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      articleCount: 0,
    };
    await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify([newFolder, ...folders]));
    console.log('[Database] Folder created:', newFolder.id);
    return newFolder;
  } catch (error) {
    console.error('[Database] Error creating folder:', error);
    throw error;
  }
};

export const getAllFolders = async (): Promise<Folder[]> => {
  try {
    const data = await AsyncStorage.getItem(FOLDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[Database] Error getting folders:', error);
    return [];
  }
};

export const deleteFolder = async (id: string): Promise<void> => {
  try {
    const folders = await getAllFolders();
    const filtered = folders.filter(f => f.id !== id);
    await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(filtered));
    // Also remove folderId from articles in this folder
    const articles = await getAllArticles();
    const updatedArticles = articles.map(a =>
      a.folderId === id ? { ...a, folderId: undefined } : a
    );
    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(updatedArticles));
    console.log('[Database] Folder deleted:', id);
  } catch (error) {
    console.error('[Database] Error deleting folder:', error);
    throw error;
  }
};

export const getFolderByName = async (name: string): Promise<Folder | null> => {
  try {
    const folders = await getAllFolders();
    return folders.find(f => f.name.toLowerCase() === name.toLowerCase()) || null;
  } catch (error) {
    console.error('[Database] Error getting folder by name:', error);
    return null;
  }
};

export const addArticlesToFolder = async (folderId: string, articleIds: string[]): Promise<void> => {
  try {
    const articles = await getAllArticles();
    const updatedArticles = articles.map(a =>
      articleIds.includes(a.id) ? { ...a, folderId } : a
    );
    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(updatedArticles));
    // Update folder article count
    await updateFolderArticleCount(folderId);
    console.log('[Database] Added articles to folder:', folderId, articleIds);
  } catch (error) {
    console.error('[Database] Error adding articles to folder:', error);
    throw error;
  }
};

export const getArticlesByFolder = async (folderId: string): Promise<Article[]> => {
  try {
    const articles = await getAllArticles();
    return articles.filter(a => a.folderId === folderId);
  } catch (error) {
    console.error('[Database] Error getting articles by folder:', error);
    return [];
  }
};

export const updateFolderArticleCount = async (folderId: string): Promise<void> => {
  try {
    const folders = await getAllFolders();
    const articles = await getAllArticles();
    const count = articles.filter(a => a.folderId === folderId).length;
    const updatedFolders = folders.map(f =>
      f.id === folderId ? { ...f, articleCount: count } : f
    );
    await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updatedFolders));
  } catch (error) {
    console.error('[Database] Error updating folder article count:', error);
  }
};

export const updateFolder = async (id: string, updates: Partial<Folder>): Promise<void> => {
  try {
    const folders = await getAllFolders();
    const updatedFolders = folders.map(f =>
      f.id === id ? { ...f, ...updates } : f
    );
    await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updatedFolders));
    console.log('[Database] Folder updated:', id);
  } catch (error) {
    console.error('[Database] Error updating folder:', error);
    throw error;
  }
};

// ===== TAGS =====

export const createTag = async (name: string): Promise<Tag> => {
  try {
    const tags = await getAllTags();
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      articleCount: 0,
    };
    await AsyncStorage.setItem(TAGS_KEY, JSON.stringify([newTag, ...tags]));
    console.log('[Database] Tag created:', newTag.id);
    return newTag;
  } catch (error) {
    console.error('[Database] Error creating tag:', error);
    throw error;
  }
};

export const getAllTags = async (): Promise<Tag[]> => {
  try {
    const data = await AsyncStorage.getItem(TAGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[Database] Error getting tags:', error);
    return [];
  }
};

export const deleteTag = async (id: string): Promise<void> => {
  try {
    const tags = await getAllTags();
    const filtered = tags.filter(t => t.id !== id);
    await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(filtered));
    console.log('[Database] Tag deleted:', id);
  } catch (error) {
    console.error('[Database] Error deleting tag:', error);
    throw error;
  }
};

// ===== SETTINGS =====

const defaultSettings: AppSettings = {
  theme: 'dark',
  fontSize: 'medium',
  fontFamily: 'serif',
  defaultView: 'all',
  darkAccent: 'orange',
  darkBackground: 'true-black',
  lightAccent: 'orange',
  lightBackground: 'pure-white',
};

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : defaultSettings;
  } catch (error) {
    console.error('[Database] Error getting settings:', error);
    return defaultSettings;
  }
};

export const updateSettings = async (updates: Partial<AppSettings>): Promise<AppSettings> => {
  try {
    const current = await getSettings();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    console.log('[Database] Settings updated');
    return updated;
  } catch (error) {
    console.error('[Database] Error updating settings:', error);
    throw error;
  }
};

/**
 * Add tags to multiple articles
 */
export const addTagsToArticles = async (articleIds: string[], tagsToAdd: string[]): Promise<number> => {
  try {
    const articles = await getAllArticles();
    let updatedCount = 0;

    const updatedArticles = articles.map(article => {
      if (articleIds.includes(article.id)) {
        // Merge existing tags with new tags (avoid duplicates)
        const existingTags = article.tags || [];
        const mergedTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
        updatedCount++;
        return { ...article, tags: mergedTags };
      }
      return article;
    });

    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(updatedArticles));
    console.log('[Database] Tags added to', updatedCount, 'articles');
    return updatedCount;
  } catch (error) {
    console.error('[Database] Error adding tags to articles:', error);
    throw error;
  }
};

/**
 * Add tags to all articles
 */
export const addTagsToAllArticles = async (tagsToAdd: string[]): Promise<number> => {
  try {
    const articles = await getAllArticles();
    const articleIds = articles.map(a => a.id);
    return await addTagsToArticles(articleIds, tagsToAdd);
  } catch (error) {
    console.error('[Database] Error adding tags to all articles:', error);
    throw error;
  }
};

/**
 * Get articles by tag name
 */
export const getArticlesByTag = async (tagName: string): Promise<Article[]> => {
  try {
    const articles = await getAllArticles();
    return articles.filter(article =>
      article.tags?.includes(tagName) || false
    );
  } catch (error) {
    console.error('[Database] Error getting articles by tag:', error);
    return [];
  }
};

/**
 * Get all unique user tags from articles
 */
export const getAllUserTags = async (): Promise<string[]> => {
  try {
    const articles = await getAllArticles();
    const allTags = new Set<string>();
    articles.forEach(article => {
      article.tags?.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags);
  } catch (error) {
    console.error('[Database] Error getting user tags:', error);
    return [];
  }
};

/**
 * Get tag statistics (tag name -> article count)
 */
export const getTagStats = async (): Promise<{name: string; count: number}[]> => {
  try {
    const articles = await getAllArticles();
    const tagCounts = new Map<string, number>();

    articles.forEach(article => {
      article.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[Database] Error getting tag stats:', error);
    return [];
  }
};

/**
 * Get all bookmarked articles (Priority)
 */
export const getBookmarkedArticles = async (): Promise<Article[]> => {
  try {
    const articles = await getAllArticles();
    return articles.filter(article => article.isBookmarked === true);
  } catch (error) {
    console.error('[Database] Error getting bookmarked articles:', error);
    return [];
  }
};

/**
 * Get all favorite articles (Starred)
 */
export const getFavoriteArticles = async (): Promise<Article[]> => {
  try {
    const articles = await getAllArticles();
    return articles.filter(article => article.isFavorite === true);
  } catch (error) {
    console.error('[Database] Error getting favorite articles:', error);
    return [];
  }
};

