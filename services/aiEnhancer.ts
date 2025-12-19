/**
 * AI Enhancement Service
 * Uses OpenAI GPT-4o to enhance article content extraction
 * Generates summaries, key points, tags, and categorization
 */

import axios from 'axios';
import { OPENAI_API_KEY as ENV_API_KEY, OPENAI_MODEL } from '@env';
import { getOpenAiApiKey } from './keychainService';
import { Article, ExtractedArticleData } from './database';
import { PlatformType, detectPlatformFromUrl, getPlatformConfig } from '../styles/platformColors';

interface EnhancedContent {
  summary: string;
  keyPoints: string[];
  suggestedTags: string[];
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  readingTimeMinutes: number;
  platform: PlatformType;
  platformColor: string;
}

interface ExtractedArticleDataWithEnhancement extends ExtractedArticleData {
  aiEnhanced?: boolean;
  aiSummary?: string;
  aiKeyPoints?: string[];
  aiTags?: string[];
  aiCategory?: string;
}

/**
 * Get active API key - Priority: User key from keychain, fallback to .env
 */
const getActiveApiKey = async (): Promise<string> => {
  try {
    // Priority 1: User's saved key from Keychain (if they added one in Settings)
    const userKey = await getOpenAiApiKey();
    if (userKey) {
      console.log('[AIEnhancer] Using user-provided API key from keychain');
      return userKey;
    }
  } catch (error) {
    console.log('[AIEnhancer] Could not retrieve user key from keychain:', error);
  }

  // Priority 2: Fallback to .env key (for development)
  if (ENV_API_KEY && ENV_API_KEY !== 'your_api_key_here' && ENV_API_KEY.trim()) {
    console.log('[AIEnhancer] Using API key from .env');
    return ENV_API_KEY;
  }

  throw new Error('No API key configured. Please add one in Settings.');
};

/**
 * Create a comprehensive prompt for article analysis
 */
const createAnalysisPrompt = (title: string, content: string, url: string): string => {
  return `You are an expert content analyst. Analyze the following article and provide high-quality structured information.

ARTICLE URL: ${url}
ARTICLE TITLE: ${title}

ARTICLE CONTENT:
${content.substring(0, 3000)}

Please provide a JSON response with EXACTLY this structure (no markdown, no code blocks, just pure JSON):

{
  "summary": "A 2-3 sentence concise summary capturing the main idea and key takeaway",
  "keyPoints": ["First major point discussed", "Second major point", "Third major point"],
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "category": "Technology|Science|Business|Health|Politics|Entertainment|Sports|Education|Other",
  "sentiment": "positive|neutral|negative",
  "readingTimeMinutes": 3,
  "platform": "twitter|facebook|instagram|youtube|chrome|safari|other"
}

IMPORTANT GUIDELINES:
- Summary: Clear, informative, 2-3 sentences max. Highlight the core message.
- Key Points: 3-5 bullet points of the most important information. Make them actionable or insightful.
- Tags: Maximum 3 relevant, searchable tags. Use lowercase. Make them specific to the content.
- Category: Pick the SINGLE most relevant category from the list provided.
- Sentiment: Analyze the overall tone (positive=encouraging/optimistic, neutral=factual, negative=critical/cautionary).
- Reading Time: Estimate in minutes based on content length and complexity.
- Platform: Detect the content source platform from URL and content. Use "twitter" for X/Twitter, "chrome" or "safari" for web articles, or "other" if uncertain.

Return ONLY valid JSON. No additional text.`;
};

/**
 * Parse AI response and extract structured data
 */
const parseAiResponse = (responseText: string, url: string): EnhancedContent | null => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[AIEnhancer] No JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.summary || !parsed.keyPoints || !parsed.suggestedTags || !parsed.category) {
      console.log('[AIEnhancer] Missing required fields in parsed response');
      return null;
    }

    // Detect platform from URL first, then use AI's suggestion as fallback
    let detectedPlatform = detectPlatformFromUrl(url);

    // If URL detection returns 'other', try to use AI's platform detection
    if (detectedPlatform === 'other' && parsed.platform) {
      const aiPlatform = String(parsed.platform).toLowerCase() as PlatformType;
      const validPlatforms: PlatformType[] = ['twitter', 'facebook', 'instagram', 'youtube', 'chrome', 'safari', 'other'];
      if (validPlatforms.includes(aiPlatform)) {
        detectedPlatform = aiPlatform;
      }
    }

    const platformConfig = getPlatformConfig(detectedPlatform);

    return {
      summary: String(parsed.summary).substring(0, 500),
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.slice(0, 5).map((p: any) => String(p).substring(0, 200))
        : [],
      suggestedTags: Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags.slice(0, 3).map((t: any) => String(t).toLowerCase().trim())
        : [],
      category: String(parsed.category).substring(0, 50),
      sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      readingTimeMinutes: Math.max(1, Math.min(60, parseInt(parsed.readingTimeMinutes) || 3)),
      platform: detectedPlatform,
      platformColor: platformConfig.color,
    };
  } catch (error) {
    console.error('[AIEnhancer] Error parsing AI response:', error);
    return null;
  }
};

/**
 * Enhance article with AI analysis
 */
export const enhanceArticleContent = async (
  title: string,
  content: string,
  url: string
): Promise<EnhancedContent | null> => {
  try {
    console.log('[AIEnhancer] Starting AI enhancement...');
    console.log('[AIEnhancer] URL:', url);

    // Validate inputs
    if (!title || !content || !url) {
      throw new Error('Title, content, and URL are required for AI enhancement');
    }

    // Get API key
    const apiKey = await getActiveApiKey();
    if (!apiKey) {
      throw new Error('No valid API key available');
    }

    const prompt = createAnalysisPrompt(title, content, url);

    console.log('[AIEnhancer] Calling OpenAI API...');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful content analysis assistant. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('[AIEnhancer] API response received');

    // Extract the response text
    const responseText = response.data.choices[0]?.message?.content || '';
    console.log('[AIEnhancer] Response text received, length:', responseText.length);

    // Parse the response
    const enhanced = parseAiResponse(responseText, url);
    if (!enhanced) {
      console.warn('[AIEnhancer] Failed to parse AI response, returning null');
      return null;
    }

    console.log('[AIEnhancer] Article enhanced successfully');
    console.log('[AIEnhancer] Platform detected:', enhanced.platform);
    return enhanced;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AIEnhancer] Error during AI enhancement:', errorMessage);
    // Return null instead of throwing - let article save continue without enhancement
    return null;
  }
};

/**
 * Enhance full article object (for background processing)
 */
export const enhanceArticle = async (
  article: Article
): Promise<Partial<Article> | null> => {
  try {
    console.log('[AIEnhancer] Enhancing article:', article.id);

    const enhanced = await enhanceArticleContent(article.title, article.content, article.url);
    if (!enhanced) {
      return null;
    }

    return {
      id: article.id,
      aiSummary: enhanced.summary,
      aiKeyPoints: enhanced.keyPoints,
      aiTags: enhanced.suggestedTags,
      aiCategory: enhanced.category,
      aiSentiment: enhanced.sentiment,
      readingTimeMinutes: enhanced.readingTimeMinutes,
      platform: enhanced.platform,
      platformColor: enhanced.platformColor,
      aiEnhanced: true,
    };
  } catch (error) {
    console.error('[AIEnhancer] Error in enhanceArticle:', error);
    return null;
  }
};

/**
 * Test AI connection and API key validity
 */
export const testAiConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('[AIEnhancer] Testing AI connection...');

    const apiKey = await getActiveApiKey();
    if (!apiKey) {
      return {
        success: false,
        message: 'No API key configured',
      };
    }

    const testPrompt = 'Respond with "OK" if you received this message.';

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: testPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 10,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (response.status === 200) {
      console.log('[AIEnhancer] Connection test successful');
      return {
        success: true,
        message: 'AI connection successful',
      };
    }

    return {
      success: false,
      message: 'Unexpected API response',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AIEnhancer] Connection test failed:', errorMessage);

    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return {
        success: false,
        message: 'Invalid API key',
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        success: false,
        message: 'API request timed out',
      };
    }

    return {
      success: false,
      message: 'Connection failed: ' + errorMessage,
    };
  }
};
