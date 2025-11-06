/**
 * Article Extraction Service
 * Uses Jina AI Reader API to extract article content from URLs
 */

import axios from 'axios';
import { Article } from './database';
import { OPENAI_API_KEY, OPENAI_MODEL } from '@env';

const JINA_API_URL = 'https://r.jina.ai/';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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
    console.log('[ArticleExtractor] Full response data:', JSON.stringify(data, null, 2));

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

    // Generate title and description using GPT-4o
    const { title: gptTitle, description: gptDescription } = await generateTitleAndDescription(content, url);

    // Use GPT-4o generated title and description, with Jina fallbacks
    const title = gptTitle || data.title || extractTitleFromUrl(url);
    const description = gptDescription || data.description || extractDescription(content);
    const author = data.author || 'Unknown';
    const publishDate = data.publish_date || data.publishedTime || new Date().toISOString();
    const imageUrl = data.image || data.imageUrl || '';

    // Log all metadata for debugging
    console.log('[ArticleExtractor] Final metadata:', {
      title,
      description: description.substring(0, 100),
      author,
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

  // Since we're using GPT-4o now, title should already be good
  // But keep safety checks just in case
  let finalTitle = extractedData.title;

  // Make absolutely sure we never use the ID as title
  if (!finalTitle || finalTitle.trim() === '' || finalTitle === articleId || finalTitle.includes(articleId)) {
    console.warn('[ArticleExtractor] Title was invalid, using fallback');
    finalTitle = 'Article from ' + new URL(url).hostname;
  }

  const article: Article = {
    id: articleId,
    url,
    title: finalTitle,
    content: extractedData.content,
    author: extractedData.author,
    publishDate: extractedData.publishDate,
    summary: extractedData.description,
    imageUrl: extractedData.imageUrl,
    savedAt: new Date().toISOString(),
  };

  console.log('[ArticleExtractor] Article object created with ID:', article.id, 'Title:', article.title);
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
 * Generate title and description using GPT-4o
 */
const generateTitleAndDescription = async (content: string, url: string): Promise<{ title: string; description: string }> => {
  try {
    console.log('[ArticleExtractor] Generating title and description using GPT-4o...');

    if (!OPENAI_API_KEY) {
      console.warn('[ArticleExtractor] No OpenAI API key available, using fallback');
      return {
        title: extractTitleFromUrl(url),
        description: extractDescription(content)
      };
    }

    const prompt = `Analyze the following article content and generate:
1. A concise, engaging title (max 60 characters)
2. A brief description/summary (max 150 characters)

Article content:
${content.substring(0, 2000)}

URL: ${url}

Return in JSON format:
{
  "title": "your title here",
  "description": "your description here"
}`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyzer. Generate accurate, engaging titles and descriptions for articles.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 10000
      }
    );

    const result = response.data.choices[0].message.content;
    console.log('[ArticleExtractor] GPT-4o response:', result);

    // Parse the JSON response - handle markdown code blocks and extra formatting
    let jsonString = result.trim();

    // Remove markdown code blocks if present (```json ... ```)
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    console.log('[ArticleExtractor] Cleaned JSON string:', jsonString);

    const parsed = JSON.parse(jsonString);

    console.log('[ArticleExtractor] Generated title:', parsed.title);
    console.log('[ArticleExtractor] Generated description:', parsed.description);

    return {
      title: parsed.title || extractTitleFromUrl(url),
      description: parsed.description || extractDescription(content)
    };
  } catch (error) {
    console.error('[ArticleExtractor] Error generating with GPT-4o:', error);
    // Fallback to original methods
    return {
      title: extractTitleFromUrl(url),
      description: extractDescription(content)
    };
  }
};

/**
 * Extract title from URL or use hostname as fallback
 */
const extractTitleFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);

    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      // Only use path if it's not just a single letter or number (like login pages)
      if (lastPart.length > 2) {
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\.[^/.]+$/, '')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    // Fallback to hostname (e.g., "x.com" becomes "X")
    const hostname = urlObj.hostname
      .replace('www.', '')
      .split('.')[0]
      .toUpperCase();
    return hostname || 'Article';
  } catch {
    return 'Article';
  }
};

/**
 * Extract title from content (first meaningful sentence)
 */
const extractTitleFromContent = (content: string): string => {
  if (!content) return '';

  // Get first sentence or first 50 chars, whichever is shorter
  const sentences = content.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim() || '';

  if (firstSentence.length > 80) {
    // If first sentence is too long, use first 70 chars
    return firstSentence.substring(0, 70).trim() + '...';
  }

  return firstSentence || 'Article';
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
