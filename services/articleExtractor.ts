/**
 * Article Extraction Service
 * Uses Jina AI Reader API to extract article content from URLs
 */

import axios from 'axios';
import { Article, getSettings } from './database';
import { OPENAI_API_KEY, OPENAI_MODEL } from '@env';
import { detectPlatformFromUrl, getVideoThumbnailUrl, PlatformType, PLATFORM_COLORS } from '../styles/platformColors';
import { enhanceArticleContent } from './aiEnhancer';

const JINA_API_URL = 'https://r.jina.ai/';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MICROLINK_API_URL = 'https://api.microlink.io/';

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
  hasVideo?: boolean;
  tweetText?: string;
  tags?: string[];
}

/**
 * Fetch YouTube metadata using oEmbed API
 * YouTube blocks normal scraping, so we use their official oEmbed endpoint
 */
const fetchYouTubeMetadata = async (url: string): Promise<{
  title?: string;
  description?: string;
  image?: string;
  author?: string;
}> => {
  try {
    console.log('[ArticleExtractor] Fetching YouTube metadata via oEmbed...');
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

    const response = await fetch(oembedUrl, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[ArticleExtractor] YouTube oEmbed success:', JSON.stringify({
        title: data.title,
        author: data.author_name,
        thumbnail: data.thumbnail_url,
      }, null, 2));

      return {
        title: data.title || undefined,
        description: undefined, // oEmbed doesn't provide description
        image: data.thumbnail_url || undefined,
        author: data.author_name || undefined,
      };
    } else {
      console.log('[ArticleExtractor] YouTube oEmbed failed with status:', response.status);
    }
  } catch (error) {
    console.log('[ArticleExtractor] YouTube oEmbed failed:', error);
  }
  return {};
};

/**
 * Fetch metadata using direct HTTP scraping (Open Graph tags)
 * Fallback method when API services are unavailable
 */
const fetchMetadataViaHttp = async (url: string): Promise<{
  title?: string;
  description?: string;
  image?: string;
  author?: string;
}> => {
  try {
    console.log('[ArticleExtractor] Trying direct HTTP fetch for metadata...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log('[ArticleExtractor] HTTP fetch failed with status:', response.status);
      return {};
    }

    const html = await response.text();
    if (!html || typeof html !== 'string') {
      console.log('[ArticleExtractor] Invalid HTML response');
      return {};
    }

    const metadata: { title?: string; description?: string; image?: string; author?: string } = {};

    // Extract og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      metadata.title = ogTitleMatch[1];
    } else {
      // Fallback to regular title tag
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        metadata.title = titleMatch[1];
      }
    }

    // Extract og:description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch && ogDescMatch[1]) {
      metadata.description = ogDescMatch[1];
    } else {
      // Fallback to regular description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      if (descMatch && descMatch[1]) {
        metadata.description = descMatch[1];
      }
    }

    // Extract og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      metadata.image = ogImageMatch[1];
    }

    // Extract author (twitter:creator or article:author)
    const authorMatch = html.match(/<meta[^>]*(?:name|property)=["'](?:twitter:creator|article:author|author)["'][^>]*content=["']([^"']*)["']/i);
    if (authorMatch && authorMatch[1]) {
      metadata.author = authorMatch[1].replace(/^@/, '');
    }

    console.log('[ArticleExtractor] HTTP scraping result:', {
      title: metadata.title?.substring(0, 50),
      description: metadata.description?.substring(0, 50),
      hasImage: !!metadata.image,
      author: metadata.author,
    });

    return metadata;
  } catch (error) {
    console.log('[ArticleExtractor] HTTP fetch failed:', error);
    return {};
  }
};

/**
 * Fetch metadata using microlink.io API (primary)
 * Falls back to direct HTTP scraping if API fails
 */
const fetchSocialMetadata = async (url: string): Promise<{
  title?: string;
  description?: string;
  image?: string;
  author?: string;
}> => {
  // Strategy 1: Try microlink.io (primary)
  try {
    console.log('[ArticleExtractor] Fetching metadata from microlink.io...');
    const apiUrl = `${MICROLINK_API_URL}?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
    });

    if (response.ok) {
      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const data = result.data;
        console.log('[ArticleExtractor] microlink.io success:', JSON.stringify({
          title: data.title,
          description: data.description,
          author: data.author,
          hasImage: !!data.image?.url,
        }, null, 2));

        return {
          title: data.title || undefined,
          description: data.description || undefined,
          image: data.image?.url || undefined,
          author: data.author || undefined,
        };
      } else {
        console.log('[ArticleExtractor] microlink.io returned error:', result.status);
      }
    } else {
      console.log('[ArticleExtractor] microlink.io returned status:', response.status);
    }
  } catch (error) {
    console.log('[ArticleExtractor] microlink.io failed:', error);
  }

  // Strategy 2: Fallback to direct HTTP scraping
  console.log('[ArticleExtractor] Trying HTTP fallback...');
  const httpMetadata = await fetchMetadataViaHttp(url);

  if (httpMetadata.title || httpMetadata.description || httpMetadata.image) {
    console.log('[ArticleExtractor] HTTP fallback succeeded');
    return httpMetadata;
  }

  console.log('[ArticleExtractor] All metadata extraction strategies failed');
  return {};
};

/**
 * Extract article content from URL using Jina AI
 * For Instagram/TikTok, uses jsonlink.io API instead (better for social media)
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

    // Detect platform
    const platform = detectPlatformFromUrl(url);
    console.log('[ArticleExtractor] Detected platform:', platform);

    // For Instagram, TikTok, YouTube, and Reddit, use microlink.io metadata extraction
    // This approach works better for social media metadata extraction (Jina can't scrape these)
    // Note: Twitter uses Jina (works well for public tweets)
    if (platform === 'instagram' || platform === 'tiktok' || platform === 'youtube' || platform === 'reddit') {
      console.log('[ArticleExtractor] Using microlink.io extraction for', platform);

      let metadata = await fetchSocialMetadata(url);
      const username = extractUsernameFromUrl(url, platform);

      // Platform display names
      const platformNames: Record<string, string> = {
        instagram: 'Instagram',
        youtube: 'YouTube',
        tiktok: 'TikTok',
        reddit: 'Reddit',
      };
      const platformName = platformNames[platform] || platform;
      const contentType = platform === 'instagram' ? 'Reel' : platform === 'reddit' ? 'Post' : 'Video';

      // For YouTube: Check if microlink returned a generic/bad title, use oEmbed as fallback
      if (platform === 'youtube') {
        const isGenericTitle = !metadata.title ||
          metadata.title.trim() === '' ||
          metadata.title.trim() === '- YouTube' ||
          metadata.title.trim() === 'YouTube' ||
          metadata.title.toLowerCase().includes('login');

        if (isGenericTitle) {
          console.log('[ArticleExtractor] microlink returned generic YouTube title, trying oEmbed...');
          const youtubeMetadata = await fetchYouTubeMetadata(url);
          if (youtubeMetadata.title) {
            metadata = {
              ...metadata,
              title: youtubeMetadata.title,
              image: youtubeMetadata.image || metadata.image,
              author: youtubeMetadata.author || metadata.author,
            };
            console.log('[ArticleExtractor] Using YouTube oEmbed metadata:', metadata.title);
          }
        }
      }

      // Build title from metadata or fallback
      let title = metadata.title;
      if (!title || title.trim() === '' || title.toLowerCase().includes('login') || title.toLowerCase().includes('sign up')) {
        title = username ? `${platformName} ${contentType} by @${username}` : `${platformName} ${contentType}`;
      }

      // For Reddit: Clean up underscored titles (e.g., "is_there_a_list" -> "Is there a list")
      if (platform === 'reddit' && title.includes('_')) {
        title = title.replace(/_/g, ' ');
        // Capitalize first letter
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      // Clean up description
      let description = metadata.description;
      if (!description || description.trim() === '' || description.toLowerCase().includes('login')) {
        description = `View this ${contentType.toLowerCase()} on ${platformName}`;
      }

      console.log('[ArticleExtractor] Social metadata extraction result:', { title, description, image: metadata.image });

      // Determine if it's video content
      const isVideoContent = platform !== 'reddit';

      return {
        title,
        content: description,
        author: metadata.author || username || 'Unknown',
        publishDate: new Date().toISOString(),
        description,
        imageUrl: metadata.image || '',
        hasVideo: isVideoContent,
        tags: [platformName.toLowerCase(), contentType.toLowerCase()]
      };
    }

    // For other platforms, use Jina AI Reader API
    console.log('[ArticleExtractor] Calling Jina AI API...');
    const jenaUrl = `${JINA_API_URL}${url}`;
    console.log('[ArticleExtractor] Jina API URL:', jenaUrl);

    const response = await axios.get(jenaUrl, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 30000, // Increased timeout to 30 seconds
      validateStatus: (status) => status >= 200 && status < 500, // Don't throw on 4xx errors
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

    // For Twitter/X: Use Jina output directly WITHOUT GPT (GPT keeps generating fake text)
    if (platform === 'twitter') {
      console.log('[ArticleExtractor] Twitter detected - using Jina output directly (no GPT)');

      // Get tweet text - Jina puts the full tweet in data.title like:
      // "Username on X: \"tweet text here\" / X"
      const jinaTitle = data.data?.title || data.title || '';
      let tweetText = '';

      // Extract tweet text from Jina's title format: "Username on X: \"tweet text\" / X"
      const titleMatch = jinaTitle.match(/on X: [""](.+?)[""](?:\s*\/\s*X)?$/s);
      if (titleMatch && titleMatch[1]) {
        tweetText = titleMatch[1].trim();
      } else {
        // Fallback: try to extract from content
        tweetText = extractTweetFromJina(content);
      }

      const username = extractUsernameFromUrl(url, 'twitter') || data.author || 'Unknown';

      // Create a title from the tweet text (first 50 chars)
      const title = tweetText.length > 50
        ? tweetText.substring(0, 47) + '...'
        : tweetText || `Tweet by @${username}`;

      console.log('[ArticleExtractor] Twitter extraction result:', {
        title,
        tweetText: tweetText.substring(0, 100),
        username,
        jinaTitle: jinaTitle.substring(0, 100),
      });

      return {
        title,
        content,
        author: username,
        publishDate: new Date().toISOString(),
        description: tweetText,
        imageUrl: data.image || data.data?.image || '',
        tweetText,
        hasVideo: content.toLowerCase().includes('video') || content.toLowerCase().includes('watch'),
        tags: ['twitter'],
      };
    }

    // Generate title and description using GPT-4o (for non-Twitter platforms)
    const { title: gptTitle, description: gptDescription, tweetText, hasVideo, tags } = await generateTitleAndDescription(content, url);

    // Use GPT-4o generated title and description
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
      hasVideo: hasVideo,
      hasTweetText: !!tweetText,
      tags: tags || [],
    });

    console.log('[ArticleExtractor] Successfully extracted article');

    return {
      title,
      content,
      author,
      publishDate,
      description,
      imageUrl,
      tweetText,
      hasVideo,
      tags,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ArticleExtractor] Error extracting article:');
    console.error('[ArticleExtractor] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[ArticleExtractor] Error message:', errorMessage);
    console.error('[ArticleExtractor] Error code:', error?.code);
    console.error('[ArticleExtractor] Error config:', error?.config?.url);

    if (error instanceof Error && error.stack) {
      console.error('[ArticleExtractor] Stack:', error.stack);
    }

    // Provide more user-friendly error messages
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      throw new Error('Request timed out. Please check your internet connection and try again.');
    } else if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    } else if (error?.response?.status === 404) {
      throw new Error('Article not found at this URL.');
    } else if (error?.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }

    throw new Error(`Failed to extract article: ${errorMessage}`);
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

  // Detect platform from URL
  const platform = detectPlatformFromUrl(url);
  const platformConfig = PLATFORM_COLORS[platform];
  console.log('[ArticleExtractor] Detected platform:', platform);

  // Get video thumbnail if it's a video platform
  let imageUrl = extractedData.imageUrl;
  if (!imageUrl || imageUrl === '') {
    const videoThumbnail = getVideoThumbnailUrl(url, platform);
    if (videoThumbnail) {
      imageUrl = videoThumbnail;
      console.log('[ArticleExtractor] Using video thumbnail:', imageUrl);
    }
  }

  const article: Article = {
    id: articleId,
    url,
    title: finalTitle,
    content: extractedData.content,
    author: extractedData.author,
    publishDate: extractedData.publishDate,
    summary: extractedData.description,
    imageUrl,
    savedAt: new Date().toISOString(),
    isUnread: true,
    platform, // Set platform from URL detection
    platformColor: platformConfig.color,
    tags: extractedData.tags, // Include extracted tags
  };

  console.log('[ArticleExtractor] Article object created with ID:', article.id, 'Title:', article.title, 'Platform:', platform, 'Tags:', extractedData.tags || []);
  return article;
};

/**
 * Filter out platform-based tags, keep only topic-based tags
 */
const filterTopicTags = (tags: string[]): string[] => {
  const platformNames = [
    'youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'reddit',
    'linkedin', 'snapchat', 'pinterest', 'chrome', 'safari', 'web',
    'video', 'reel', 'post', 'tweet', 'article', 'link', 'content',
    'social', 'media', 'platform', 'app', 'website', 'online'
  ];

  return tags.filter(tag => {
    const lowerTag = tag.toLowerCase();
    // Filter out platform names and generic terms
    return !platformNames.some(platform => lowerTag.includes(platform));
  });
};

/**
 * Extract and create article in one step (FAST - no AI enhancement)
 * AI enhancement should be done separately in the background
 */
export const extractAndCreateArticle = async (url: string): Promise<Article> => {
  console.log('[ArticleExtractor] extractAndCreateArticle called for URL:', url);
  try {
    const extractedData = await extractArticleFromUrl(url);
    console.log('[ArticleExtractor] Extraction completed, creating article object...');
    const article = createArticle(url, extractedData);
    console.log('[ArticleExtractor] Article created successfully with ID:', article.id);

    // Return immediately - AI enhancement will be done in background
    return article;
  } catch (error) {
    console.error('[ArticleExtractor] Failed in extractAndCreateArticle');
    throw error;
  }
};

/**
 * Enhance article with AI in the background (called AFTER saving)
 * Returns the enhanced article data to be merged
 * Note: AI tagging feature has been removed
 */
export const enhanceArticleInBackground = async (article: Article): Promise<Partial<Article> | null> => {
  // AI tagging feature removed
  return null;
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
 * Extract username from Instagram/TikTok URL
 */
const extractUsernameFromUrl = (url: string, platform: PlatformType): string | null => {
  try {
    if (platform === 'instagram') {
      // Instagram URLs: instagram.com/username/reel/ID or instagram.com/reel/ID
      const match = url.match(/instagram\.com\/([^\/]+)\/(?:reel|p)\//);
      if (match && match[1] !== 'reel' && match[1] !== 'p') {
        return match[1];
      }
      // Alternative format: instagram.com/reel/ID (no username in URL)
      return null;
    }
    if (platform === 'tiktok') {
      // TikTok URLs: tiktok.com/@username/video/ID
      const match = url.match(/tiktok\.com\/@([^\/]+)/);
      return match ? match[1] : null;
    }
    if (platform === 'twitter') {
      // Twitter/X URLs: twitter.com/username/status/ID or x.com/username/status/ID
      const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status\//);
      if (match && match[1] && !['i', 'intent'].includes(match[1])) {
        return match[1];
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Extract tweet text from Jina's markdown output
 * Jina returns markdown content - we need to parse out the actual tweet
 */
const extractTweetFromJina = (content: string): string => {
  if (!content) return '';

  // Clean up the content
  let text = content;

  // Remove markdown links [text](url) - keep the text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove image markdown ![alt](url)
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');

  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/g, '');

  // Remove common Twitter/X UI elements
  const uiPatterns = [
    /^Title:.*$/gm,
    /^URL Source:.*$/gm,
    /^Markdown Content:.*$/gm,
    /^Published Time:.*$/gm,
    /Translate post/gi,
    /Show more/gi,
    /\d+:\d+\s*(AM|PM)/gi,
    /·\s*\w+\s*\d+,\s*\d+/g,
    /\d+\s*(views?|replies|reposts?|likes?|bookmarks?)/gi,
    /Quote$/gm,
    /Reply$/gm,
    /Repost$/gm,
    /Like$/gm,
    /Share$/gm,
    /Post your reply/gi,
    /What is happening/gi,
    /^X$/gm,
    /^@\w+$/gm,
  ];

  for (const pattern of uiPatterns) {
    text = text.replace(pattern, '');
  }

  // Split by newlines and find the main content
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Filter out empty lines and very short lines (likely UI elements)
      if (line.length < 3) return false;
      // Filter out lines that are just usernames or handles
      if (/^@\w+$/.test(line)) return false;
      // Filter out lines that are just numbers (counts)
      if (/^\d+$/.test(line)) return false;
      // Filter out navigation items
      if (/^(Home|Explore|Notifications|Messages|Grok|Lists|Bookmarks|Communities|Premium|Profile|More|Settings)$/i.test(line)) return false;
      return true;
    });

  // Find the longest meaningful line - that's likely the tweet
  let bestLine = '';
  for (const line of lines) {
    if (line.length > bestLine.length && line.length < 500) {
      bestLine = line;
    }
  }

  // If we found a good line, use it
  if (bestLine.length > 10) {
    return bestLine.trim();
  }

  // Fallback: join first few meaningful lines
  const meaningfulContent = lines.slice(0, 5).join(' ').trim();
  return meaningfulContent.substring(0, 300);
};

/**
 * Check if content is too minimal to be reliable (for video platforms)
 */
const isContentMinimal = (content: string, platform: PlatformType): boolean => {
  // For video platforms, if content is less than 100 chars, it's likely Jina couldn't extract it
  const minContentLength = 100;
  const videoPlatforms: PlatformType[] = ['instagram', 'tiktok', 'youtube'];

  if (videoPlatforms.includes(platform)) {
    return !content || content.trim().length < minContentLength;
  }
  return !content || content.trim().length < 50;
};

/**
 * Generate title and description using GPT-4o
 * Handles platform-specific content extraction
 */
const generateTitleAndDescription = async (content: string, url: string): Promise<{ title: string; description: string; tweetText?: string; hasVideo?: boolean; tags?: string[] }> => {
  try {
    console.log('[ArticleExtractor] Generating title and description using GPT-4o...');

    // Detect platform for specialized prompts
    const platform = detectPlatformFromUrl(url);
    console.log('[ArticleExtractor] Detected platform for GPT prompt:', platform);

    // Check if content is too minimal (Jina couldn't extract properly)
    const contentIsMinimal = isContentMinimal(content, platform);
    const username = extractUsernameFromUrl(url, platform);

    console.log('[ArticleExtractor] Content length:', content?.length || 0, 'Is minimal:', contentIsMinimal);
    if (username) {
      console.log('[ArticleExtractor] Extracted username:', username);
    }

    // For video platforms with minimal content, use URL-based fallback
    if (contentIsMinimal && ['instagram', 'tiktok'].includes(platform)) {
      console.log('[ArticleExtractor] Content too minimal for', platform, '- using URL-based fallback');

      const platformName = platform === 'instagram' ? 'Instagram' : 'TikTok';
      const contentType = platform === 'instagram' ? 'Reel' : 'Video';

      return {
        title: username ? `${platformName} ${contentType} by @${username}` : `${platformName} ${contentType}`,
        description: `View this ${contentType.toLowerCase()} in ${platformName}`,
        hasVideo: true,
        tags: [platformName.toLowerCase(), 'video', contentType.toLowerCase()]
      };
    }

    if (!OPENAI_API_KEY) {
      console.warn('[ArticleExtractor] No OpenAI API key available, using fallback');
      return {
        title: extractTitleFromUrl(url),
        description: extractDescription(content)
      };
    }

    let prompt = '';
    let systemPrompt = 'You are a JSON API that analyzes content. You MUST respond with ONLY valid JSON, no other text.';

    if (platform === 'twitter') {
      // Twitter/X specific prompt - extract original tweet, don't summarize
      systemPrompt = 'You are a JSON API that extracts Twitter/X content. You MUST respond with ONLY valid JSON. Extract the ACTUAL tweet content from the provided text. NEVER use placeholder or example text.';
      prompt = `Extract the ACTUAL tweet content from this Twitter/X page:

Content:
${content.substring(0, 2000)}

URL: ${url}

Instructions:
- title: Create a short title (max 50 chars) summarizing what the tweet is about
- tweetText: Extract the ACTUAL tweet text from the content above. Copy it exactly as written including emojis, hashtags, mentions. DO NOT make up text or use examples.
- hasVideo: true if the tweet contains a video, false otherwise

CRITICAL: Extract the REAL content from above. Never return placeholder text like "Main topic of the tweet" or fake example tweets.

Return ONLY valid JSON:
{"title": "...", "tweetText": "...", "hasVideo": true/false}`;
    } else if (platform === 'youtube') {
      // YouTube specific prompt - extract original title and description, fix errors only
      systemPrompt = 'You are a JSON API that extracts YouTube content. You MUST respond with ONLY valid JSON. Extract the ORIGINAL video title and description, only fix spelling/extraction errors.';
      prompt = `Extract from this YouTube video content:
1. The ORIGINAL video title (fix spelling/cut-off words only, do not rewrite)
2. The ORIGINAL video description (fix spelling/extraction errors only, preserve original text)

IMPORTANT: Do NOT summarize or rewrite. Extract original content, only fix obvious extraction errors like cut-off words or spelling mistakes.

Content:
${content.substring(0, 2000)}

URL: ${url}

Return in JSON format:
{
  "title": "original video title",
  "description": "original video description"
}`;
    } else if (platform === 'instagram') {
      // Instagram specific prompt - extract original caption, fix errors only
      systemPrompt = 'You are a JSON API that extracts Instagram content. You MUST respond with ONLY valid JSON. Extract the ORIGINAL caption, only fix spelling/extraction errors.';
      prompt = `Extract from this Instagram content:
1. A short title based on the content (max 50 chars)
2. The ORIGINAL caption/description (fix spelling/extraction errors only, preserve original text including emojis and hashtags)

IMPORTANT: Do NOT summarize or rewrite. Extract original content, only fix obvious extraction errors.

Content:
${content.substring(0, 2000)}

URL: ${url}

Return in JSON format:
{
  "title": "short title",
  "description": "original caption verbatim"
}`;
    } else if (platform === 'tiktok') {
      // TikTok specific prompt - extract original caption, fix errors only
      systemPrompt = 'You are a JSON API that extracts TikTok content. You MUST respond with ONLY valid JSON. Extract the ORIGINAL caption, only fix spelling/extraction errors.';
      prompt = `Extract from this TikTok video content:
1. A short title based on the content (max 50 chars)
2. The ORIGINAL caption/description (fix spelling/extraction errors only, preserve original text including emojis and hashtags)

IMPORTANT: Do NOT summarize or rewrite. Extract original content, only fix obvious extraction errors.

Content:
${content.substring(0, 2000)}

URL: ${url}

Return in JSON format:
{
  "title": "short title",
  "description": "original caption verbatim"
}`;
    } else if (platform === 'reddit') {
      // Reddit specific prompt - extract original post, fix errors only
      systemPrompt = 'You are a JSON API that extracts Reddit content. You MUST respond with ONLY valid JSON. Extract the ORIGINAL post content, only fix spelling/extraction errors.';
      prompt = `Extract from this Reddit post:
1. The ORIGINAL post title (fix spelling/extraction errors only)
2. The ORIGINAL post content/body (fix spelling/extraction errors only, preserve original text)

IMPORTANT: Do NOT summarize or rewrite. Extract original content, only fix obvious extraction errors like cut-off words or spelling mistakes.

Content:
${content.substring(0, 2000)}

URL: ${url}

Return in JSON format:
{
  "title": "original post title",
  "description": "original post content"
}`;
    } else {
      // Default prompt for articles and other web content - extract original, fix errors only
      systemPrompt = 'You are a JSON API that extracts web content. You MUST respond with ONLY valid JSON. Extract the ORIGINAL article content, only fix spelling/extraction errors.';
      prompt = `Extract from this article/web content:
1. The ORIGINAL article title (fix spelling/extraction errors only)
2. The ORIGINAL article description/intro paragraph (fix spelling/extraction errors only, preserve original text)

IMPORTANT: Do NOT summarize or rewrite. Extract original content, only fix obvious extraction errors like cut-off words or spelling mistakes.

Article content:
${content.substring(0, 2000)}

URL: ${url}

Return in JSON format:
{
  "title": "original article title",
  "description": "original article description/intro"
}`;
    }

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300
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

    // If the response doesn't look like JSON, try to extract JSON from it
    if (!jsonString.startsWith('{')) {
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      } else {
        throw new Error('No valid JSON found in response');
      }
    }

    console.log('[ArticleExtractor] Cleaned JSON string:', jsonString);

    const parsed = JSON.parse(jsonString);

    console.log('[ArticleExtractor] Generated title:', parsed.title);
    console.log('[ArticleExtractor] Generated description:', parsed.description);
    if (parsed.tweetText) {
      console.log('[ArticleExtractor] Tweet text:', parsed.tweetText);
    }
    if (parsed.hasVideo !== undefined) {
      console.log('[ArticleExtractor] Has video:', parsed.hasVideo);
    }
    if (parsed.tags) {
      console.log('[ArticleExtractor] Tags:', parsed.tags);
    }

    // Handle description based on platform
    const detectedPlatform = detectPlatformFromUrl(url);
    let description = parsed.description;

    // For Twitter, use the original tweet text as the description (not a summary)
    if (detectedPlatform === 'twitter' && parsed.tweetText) {
      description = parsed.tweetText;
    } else if (!description && parsed.tags && Array.isArray(parsed.tags)) {
      // For video platforms, create a minimal description from tags
      if (['youtube', 'instagram', 'tiktok'].includes(detectedPlatform)) {
        description = parsed.tags.join(' • ');
      } else {
        description = extractDescription(content);
      }
    }

    return {
      title: parsed.title || extractTitleFromUrl(url),
      description: description || '',
      tweetText: parsed.tweetText,
      hasVideo: parsed.hasVideo,
      tags: parsed.tags
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
