/**
 * Platform-specific colors and configurations
 * Each platform has its own brand color and icon
 */

export type PlatformType =
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'snapchat'
  | 'reddit'
  | 'linkedin'
  | 'pinterest'
  | 'medium'
  | 'github'
  | 'spotify'
  | 'twitch'
  | 'discord'
  | 'whatsapp'
  | 'telegram'
  | 'web'
  | 'other';

export interface PlatformConfig {
  name: string;
  color: string;
  icon: string; // Ionicons name
  gradient?: string[];
}

export const PLATFORM_COLORS: Record<PlatformType, PlatformConfig> = {
  twitter: {
    name: 'Twitter / X',
    color: '#000000',
    icon: 'logo-twitter',
    gradient: ['#000000', '#14171A'],
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    icon: 'logo-facebook',
    gradient: ['#1877F2', '#4267B2'],
  },
  instagram: {
    name: 'Instagram',
    color: '#E1306C',
    icon: 'logo-instagram',
    gradient: ['#833AB4', '#FD1D1D', '#F77737'],
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    icon: 'logo-youtube',
    gradient: ['#FF0000', '#CC0000'],
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    icon: 'logo-tiktok',
    gradient: ['#000000', '#25F4EE', '#FE2C55'],
  },
  snapchat: {
    name: 'Snapchat',
    color: '#FFFC00',
    icon: 'logo-snapchat',
    gradient: ['#FFFC00', '#FFE500'],
  },
  reddit: {
    name: 'Reddit',
    color: '#FF4500',
    icon: 'logo-reddit',
    gradient: ['#FF4500', '#FF5700'],
  },
  linkedin: {
    name: 'LinkedIn',
    color: '#0A66C2',
    icon: 'logo-linkedin',
    gradient: ['#0A66C2', '#004182'],
  },
  pinterest: {
    name: 'Pinterest',
    color: '#E60023',
    icon: 'logo-pinterest',
    gradient: ['#E60023', '#BD081C'],
  },
  medium: {
    name: 'Medium',
    color: '#000000',
    icon: 'logo-medium',
    gradient: ['#000000', '#292929'],
  },
  github: {
    name: 'GitHub',
    color: '#181717',
    icon: 'logo-github',
    gradient: ['#181717', '#24292E'],
  },
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    icon: 'musical-notes',
    gradient: ['#1DB954', '#1ED760'],
  },
  twitch: {
    name: 'Twitch',
    color: '#9146FF',
    icon: 'logo-twitch',
    gradient: ['#9146FF', '#6441A5'],
  },
  discord: {
    name: 'Discord',
    color: '#5865F2',
    icon: 'logo-discord',
    gradient: ['#5865F2', '#7289DA'],
  },
  whatsapp: {
    name: 'WhatsApp',
    color: '#25D366',
    icon: 'logo-whatsapp',
    gradient: ['#25D366', '#128C7E'],
  },
  telegram: {
    name: 'Telegram',
    color: '#0088CC',
    icon: 'paper-plane',
    gradient: ['#0088CC', '#229ED9'],
  },
  web: {
    name: 'Web',
    color: '#4285F4',
    icon: 'globe-outline',
    gradient: ['#4285F4', '#34A853'],
  },
  other: {
    name: 'Other',
    color: '#6B7280',
    icon: 'link-outline',
    gradient: ['#6B7280', '#4B5563'],
  },
};

/**
 * Detect platform from URL
 */
export const detectPlatformFromUrl = (url: string): PlatformType => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com') || lowerUrl.includes('t.co/')) {
    return 'twitter';
  }
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com') || lowerUrl.includes('fb.watch')) {
    return 'facebook';
  }
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    return 'instagram';
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok')) {
    return 'tiktok';
  }
  if (lowerUrl.includes('snapchat.com') || lowerUrl.includes('snap.com')) {
    return 'snapchat';
  }
  if (lowerUrl.includes('reddit.com') || lowerUrl.includes('redd.it')) {
    return 'reddit';
  }
  if (lowerUrl.includes('linkedin.com') || lowerUrl.includes('lnkd.in')) {
    return 'linkedin';
  }
  if (lowerUrl.includes('pinterest.com') || lowerUrl.includes('pin.it')) {
    return 'pinterest';
  }
  if (lowerUrl.includes('medium.com')) {
    return 'medium';
  }
  if (lowerUrl.includes('github.com') || lowerUrl.includes('gist.github')) {
    return 'github';
  }
  if (lowerUrl.includes('spotify.com') || lowerUrl.includes('open.spotify')) {
    return 'spotify';
  }
  if (lowerUrl.includes('twitch.tv')) {
    return 'twitch';
  }
  if (lowerUrl.includes('discord.com') || lowerUrl.includes('discord.gg')) {
    return 'discord';
  }
  if (lowerUrl.includes('whatsapp.com') || lowerUrl.includes('wa.me')) {
    return 'whatsapp';
  }
  if (lowerUrl.includes('telegram.org') || lowerUrl.includes('t.me')) {
    return 'telegram';
  }

  return 'web';
};

/**
 * Get platform config by type
 */
export const getPlatformConfig = (platform: PlatformType): PlatformConfig => {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS.web;
};

/**
 * Get all platform types for filtering
 */
export const getAllPlatforms = (): PlatformType[] => {
  return Object.keys(PLATFORM_COLORS) as PlatformType[];
};

/**
 * Platform display names for UI
 */
export const PLATFORM_DISPLAY_NAMES: Record<PlatformType, string> = {
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  medium: 'Medium',
  github: 'GitHub',
  spotify: 'Spotify',
  twitch: 'Twitch',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  web: 'Web',
  other: 'Other',
};

/**
 * Check if platform is a video platform
 */
export const isVideoPlatform = (platform: PlatformType): boolean => {
  return ['youtube', 'tiktok', 'twitch', 'facebook', 'instagram'].includes(platform);
};

/**
 * Extract video ID from URL for thumbnail fetching
 */
export const extractVideoId = (url: string, platform: PlatformType): string | null => {
  try {
    if (platform === 'youtube') {
      // YouTube: youtube.com/watch?v=ID or youtu.be/ID
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    }
    if (platform === 'tiktok') {
      // TikTok: tiktok.com/@user/video/ID
      const match = url.match(/\/video\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Get video thumbnail URL
 */
export const getVideoThumbnailUrl = (url: string, platform: PlatformType): string | null => {
  const videoId = extractVideoId(url, platform);
  if (!videoId) return null;

  if (platform === 'youtube') {
    // YouTube provides thumbnails at predictable URLs
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  // TikTok and others require API calls - return null for now
  return null;
};
