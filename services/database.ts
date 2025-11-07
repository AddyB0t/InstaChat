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
  folderId?: string;
  tags?: string[];
  isUnread?: boolean;
  isFavorite?: boolean;

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

export interface AppSettings {
  theme: 'auto' | 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'serif' | 'sans-serif';
  defaultView: 'all' | 'unread';
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
 * Update article with AI enhancement results
 */
export const updateArticleWithAiEnhancement = async (
  id: string,
  aiSummary: string,
  aiKeyPoints: string[],
  aiTags: string[],
  aiCategory: string,
  aiSentiment: 'positive' | 'neutral' | 'negative',
  readingTimeMinutes: number
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
    console.log('[Database] Folder deleted:', id);
  } catch (error) {
    console.error('[Database] Error deleting folder:', error);
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
