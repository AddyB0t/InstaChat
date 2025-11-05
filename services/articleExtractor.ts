/**
 * Article Extraction Service
 * Uses Jina AI Reader API to extract article content from URLs
 */

import axios from 'axios';
import { Article } from './database';
import { v4 as uuidv4 } from 'uuid';

const JINA_API_URL = 'https://r.jina.ai/';

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
    console.log('[ArticleExtractor] Extracting from:', url);

    // Validate URL
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL');
    }

    // Call Jina AI Reader API
    const response = await axios.get(`${JINA_API_URL}${url}`, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    console.log('[ArticleExtractor] Response received');

    // Parse response
    const data = response.data;
    const content = data.data || data.content || data.text || '';
    const title = data.title || extractTitleFromUrl(url);
    const description = data.description || extractDescription(content);
    const author = data.author || 'Unknown';
    const publishDate = data.publish_date || data.publishedTime || new Date().toISOString();
    const imageUrl = data.image || data.imageUrl || '';

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
    console.error('[ArticleExtractor] Error extracting article:', error);
    throw error;
  }
};

/**
 * Create article object from extracted data
 */
export const createArticle = (url: string, extractedData: ExtractedArticleData): Article => {
  return {
    id: uuidv4(),
    url,
    title: extractedData.title,
    content: extractedData.content,
    author: extractedData.author,
    publishDate: extractedData.publishDate,
    summary: extractedData.description,
    imageUrl: extractedData.imageUrl,
    savedAt: new Date().toISOString(),
  };
};

/**
 * Extract and create article in one step
 */
export const extractAndCreateArticle = async (url: string): Promise<Article> => {
  const extractedData = await extractArticleFromUrl(url);
  return createArticle(url, extractedData);
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
