/**
 * Article Extraction Service
 * Uses Jina AI Reader API to extract article content from URLs
 */

import axios from 'axios';
import { Article } from './database';

const JINA_API_URL = 'https://r.jina.ai/';

/**
 * Generate a unique ID without requiring crypto
 * Uses timestamp + random number
 */
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export interface ExtractedArticleData {
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  description?: string;
  imageUrl?: string;
}

/**
 * Extract article content from URL using Jina AI
 */
export const extractArticleFromUrl = async (url: string): Promise<ExtractedArticleData> => {
  try {
    console.log('[ArticleExtractor] Starting extraction process');
    console.log('[ArticleExtractor] URL:', url);

    // Validate URL
    if (!isValidUrl(url)) {
      const errMsg = 'Invalid URL format. Please check the URL and try again.';
      console.error('[ArticleExtractor] ' + errMsg);
      throw new Error(errMsg);
    }
    console.log('[ArticleExtractor] URL validation passed');

    // Call Jina AI Reader API
    console.log('[ArticleExtractor] Calling Jina AI API...');
    const jenaUrl = `${JINA_API_URL}${url}`;
    console.log('[ArticleExtractor] Jina API URL:', jenaUrl);

    const response = await axios.get(jenaUrl, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    console.log('[ArticleExtractor] API Response received with status:', response.status);
    console.log('[ArticleExtractor] Response has data:', !!response.data);

    // Parse response
    const data = response.data;
    console.log('[ArticleExtractor] Response data keys:', Object.keys(data).join(', '));

    // Extract content - check for various possible field names from Jina API
    let content = '';
    if (typeof data.data === 'string') {
      content = data.data;
    } else if (typeof data.content === 'string') {
      content = data.content;
    } else if (typeof data.text === 'string') {
      content = data.text;
    } else if (data.data && typeof data.data === 'object' && data.data.content) {
      content = data.data.content;
    }

    console.log('[ArticleExtractor] Content extracted, type:', typeof content, 'length:', content ? content.length : 0);

    const title = data.title || extractTitleFromUrl(url);
    const description = data.description || (content ? extractDescription(content) : '');
    const author = data.author || 'Unknown';
    const publishDate = data.publish_date || data.publishedTime || new Date().toISOString();
    const imageUrl = data.image || data.imageUrl || '';

    console.log('[ArticleExtractor] Article metadata extracted:', {
      title: title.substring(0, 50),
      author,
      contentLength: content.length,
      descriptionLength: description.length,
      hasImage: !!imageUrl,
    });

    console.log('[ArticleExtractor] Successfully extracted article');

    return {
      title,
      content,
      author,
      publishDate,
      description,
      imageUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ArticleExtractor] Error extracting article:');
    console.error('[ArticleExtractor] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[ArticleExtractor] Error message:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('[ArticleExtractor] Stack:', error.stack);
    }
    throw error;
  }
};

/**
 * Create article object from extracted data
 */
export const createArticle = (url: string, extractedData: ExtractedArticleData): Article => {
  console.log('[ArticleExtractor] Creating article object...');
  const articleId = generateId();
  console.log('[ArticleExtractor] Generated article ID:', articleId);

  const article: Article = {
    id: articleId,
    url,
    title: extractedData.title,
    content: extractedData.content,
    author: extractedData.author,
    publishDate: extractedData.publishDate,
    summary: extractedData.description,
    imageUrl: extractedData.imageUrl,
    savedAt: new Date().toISOString(),
  };

  console.log('[ArticleExtractor] Article object created with ID:', article.id);
  return article;
};

/**
 * Extract and create article in one step
 */
export const extractAndCreateArticle = async (url: string): Promise<Article> => {
  console.log('[ArticleExtractor] extractAndCreateArticle called for URL:', url);
  try {
    const extractedData = await extractArticleFromUrl(url);
    console.log('[ArticleExtractor] Extraction completed, creating article object...');
    const article = createArticle(url, extractedData);
    console.log('[ArticleExtractor] Article created successfully with ID:', article.id);
    return article;
  } catch (error) {
    console.error('[ArticleExtractor] Failed in extractAndCreateArticle');
    throw error;
  }
};

/**
 * Validate URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extract title from URL
 */
const extractTitleFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1]
        .replace(/[-_]/g, ' ')
        .replace(/\.[^/.]+$/, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return urlObj.hostname;
  } catch {
    return 'Article';
  }
};

/**
 * Extract description from content
 */
const extractDescription = (content: string): string => {
  if (!content) return '';
  const words = content.split(/\s+/);
  return words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : '');
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
};

/**
 * Format content for display (first N characters)
 */
export const formatContent = (content: string, maxLength: number = 200): string => {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};
