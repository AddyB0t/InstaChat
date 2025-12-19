/**
 * VideoPreviewModal - Modal for previewing videos from various platforms
 * Supports YouTube, Twitter/X, TikTok, and other video platforms
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import { wp, hp, fp, ms, screenWidth, screenHeight } from '../utils/responsive';
import { PlatformType, getPlatformConfig, getVideoThumbnailUrl } from '../styles/platformColors';

interface VideoPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  platform: PlatformType;
  isDarkMode: boolean;
  colors: any;
}

/**
 * Get embeddable URL for different platforms
 */
const getEmbedUrl = (url: string, platform: PlatformType): string => {
  try {
    if (platform === 'youtube') {
      // Convert YouTube URL to embed format
      // youtube.com/watch?v=ID -> youtube.com/embed/ID
      // youtu.be/ID -> youtube.com/embed/ID
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (videoIdMatch) {
        return `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1&rel=0`;
      }
    }

    if (platform === 'twitter') {
      // For Twitter, we'll use the mobile version which works better in WebView
      // Convert x.com to twitter.com for better embed support
      let twitterUrl = url.replace('x.com', 'twitter.com');
      // Use publish.twitter.com embed
      return `https://platform.twitter.com/embed/Tweet.html?id=${extractTwitterId(url)}&theme=dark`;
    }

    if (platform === 'tiktok') {
      // TikTok embed URL
      const videoIdMatch = url.match(/\/video\/(\d+)/);
      if (videoIdMatch) {
        return `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}`;
      }
    }

    if (platform === 'instagram') {
      // Instagram embed - add /embed to the URL
      if (!url.includes('/embed')) {
        return url.replace(/\/?$/, '/embed');
      }
    }

    if (platform === 'facebook') {
      // Facebook video embed
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }

    // Default: return original URL
    return url;
  } catch {
    return url;
  }
};

/**
 * Extract Twitter/X tweet ID from URL
 */
const extractTwitterId = (url: string): string => {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : '';
};

/**
 * Generate HTML for embedding content
 */
const getEmbedHtml = (url: string, platform: PlatformType, isDarkMode: boolean): string => {
  const bgColor = isDarkMode ? '#1a1a1a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#000000';

  if (platform === 'youtube') {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch) {
      // Use youtube-nocookie.com for better WebView compatibility and privacy
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
            .video-container {
              position: absolute;
              top: 50%;
              left: 0;
              right: 0;
              transform: translateY(-50%);
              padding-bottom: 56.25%;
            }
            iframe {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border: none;
            }
          </style>
        </head>
        <body>
          <div class="video-container">
            <iframe
              src="https://www.youtube-nocookie.com/embed/${videoIdMatch[1]}?autoplay=1&rel=0&playsinline=1&modestbranding=1&fs=1"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowfullscreen="true"
              webkitallowfullscreen="true"
              mozallowfullscreen="true">
            </iframe>
          </div>
        </body>
        </html>
      `;
    }
  }

  if (platform === 'twitter') {
    const tweetId = extractTwitterId(url);
    if (tweetId) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { background: ${bgColor}; padding: 10px; }
          </style>
        </head>
        <body>
          <blockquote class="twitter-tweet" data-theme="${isDarkMode ? 'dark' : 'light'}">
            <a href="${url}"></a>
          </blockquote>
          <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
        </body>
        </html>
      `;
    }
  }

  if (platform === 'tiktok') {
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    if (videoIdMatch) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { background: ${bgColor}; display: flex; justify-content: center; padding: 10px; }
          </style>
        </head>
        <body>
          <blockquote
            class="tiktok-embed"
            cite="${url}"
            data-video-id="${videoIdMatch[1]}"
            style="max-width: 605px; min-width: 325px;">
          </blockquote>
          <script async src="https://www.tiktok.com/embed.js"></script>
        </body>
        </html>
      `;
    }
  }

  // Default: load URL directly in iframe
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body, html { width: 100%; height: 100%; background: ${bgColor}; }
        iframe { width: 100%; height: 100%; border: none; }
      </style>
    </head>
    <body>
      <iframe src="${url}" allowfullscreen></iframe>
    </body>
    </html>
  `;
};

export default function VideoPreviewModal({
  visible,
  onClose,
  url,
  title,
  platform,
  isDarkMode,
  colors,
}: VideoPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const platformConfig = getPlatformConfig(platform);
  const embedHtml = getEmbedHtml(url, platform, isDarkMode);

  // Get video thumbnail for YouTube
  const videoThumbnail = platform === 'youtube' ? getVideoThumbnailUrl(url, platform) : null;

  // Platforms that block WebView embedding - show native app button instead
  const blockedPlatforms: PlatformType[] = ['youtube', 'instagram', 'tiktok'];
  const isBlockedPlatform = blockedPlatforms.includes(platform);

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Open video in native app (YouTube, Instagram, TikTok, etc.)
  const openInNativeApp = async () => {
    try {
      if (platform === 'youtube') {
        // Try to open in YouTube app first
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch) {
          const youtubeAppUrl = `vnd.youtube:${videoIdMatch[1]}`;
          const canOpenApp = await Linking.canOpenURL(youtubeAppUrl);
          if (canOpenApp) {
            await Linking.openURL(youtubeAppUrl);
            return;
          }
        }
      } else if (platform === 'instagram') {
        // Try to open in Instagram app
        // Instagram URLs: instagram.com/reel/ID or instagram.com/p/ID
        const instaAppUrl = `instagram://media?id=${url}`;
        const canOpenApp = await Linking.canOpenURL('instagram://');
        if (canOpenApp) {
          // Open the web URL which will redirect to app if installed
          await Linking.openURL(url);
          return;
        }
      } else if (platform === 'tiktok') {
        // Try to open in TikTok app
        const canOpenApp = await Linking.canOpenURL('tiktok://');
        if (canOpenApp) {
          await Linking.openURL(url);
          return;
        }
      }
      // Fallback to browser
      await Linking.openURL(url);
    } catch (err) {
      console.error('Failed to open URL:', err);
      await Linking.openURL(url);
    }
  };

  // Get platform-specific button text
  const getOpenButtonText = () => {
    switch (platform) {
      case 'youtube': return 'Open in YouTube';
      case 'instagram': return 'Open in Instagram';
      case 'tiktok': return 'Open in TikTok';
      default: return 'Open in Browser';
    }
  };

  // Get platform-specific play text
  const getPlayText = () => {
    switch (platform) {
      case 'youtube': return 'Tap to play in YouTube';
      case 'instagram': return 'Tap to view in Instagram';
      case 'tiktok': return 'Tap to view in TikTok';
      default: return 'Tap to open';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.secondary }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.platformBadge, { backgroundColor: platformConfig.color }]}>
              <Icon
                name={platformConfig.icon}
                size={fp(16)}
                color={platform === 'snapchat' ? '#000000' : '#FFFFFF'}
              />
            </View>
            <Text
              style={[styles.headerTitle, { color: colors.text.primary }]}
              numberOfLines={1}
            >
              {title || platformConfig.name}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.background.tertiary }]}
            onPress={onClose}
          >
            <Icon name="close" size={fp(20)} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Video Content */}
        <View style={styles.contentContainer}>
          {isBlockedPlatform ? (
            // Blocked platforms: Show platform icon with play button
            <View style={[styles.blockedPlatformContainer, { backgroundColor: colors.background.primary }]}>
              {/* YouTube shows thumbnail, others show platform icon */}
              {platform === 'youtube' && videoThumbnail ? (
                <Image
                  source={{ uri: videoThumbnail }}
                  style={styles.youtubeThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.platformIconContainer, { backgroundColor: platformConfig.color }]}>
                  <Icon
                    name={platformConfig.icon}
                    size={fp(80)}
                    color={platform === 'snapchat' ? '#000000' : '#FFFFFF'}
                  />
                </View>
              )}

              <View style={[
                styles.thumbnailOverlay,
                platform !== 'youtube' && styles.platformOverlay
              ]}>
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    { backgroundColor: platform === 'youtube' ? 'rgba(255,0,0,0.9)' : platformConfig.color }
                  ]}
                  onPress={openInNativeApp}
                >
                  <Icon name={platform === 'youtube' ? 'play' : 'open-outline'} size={fp(48)} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.playText}>{getPlayText()}</Text>
              </View>

              {/* Video Title */}
              <View style={[styles.videoInfoContainer, { backgroundColor: colors.background.secondary }]}>
                <Text style={[styles.videoTitle, { color: colors.text.primary }]} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={[styles.videoSubtitle, { color: colors.text.tertiary }]}>
                  {platformConfig.name} {platform === 'instagram' ? 'Reel' : 'Video'}
                </Text>
              </View>
            </View>
          ) : (
            // Other platforms: Use WebView
            <>
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent.primary} />
                  <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                    Loading video...
                  </Text>
                </View>
              )}

              {error ? (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size={fp(48)} color={colors.text.tertiary} />
                  <Text style={[styles.errorText, { color: colors.text.secondary }]}>
                    Unable to load video
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
                    onPress={() => {
                      setError(false);
                      setLoading(true);
                    }}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <WebView
                  source={{ html: embedHtml }}
                  style={styles.webview}
                  onLoadEnd={handleLoadEnd}
                  onError={handleError}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  allowsFullscreenVideo={true}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback={true}
                  mixedContentMode="compatibility"
                  scrollEnabled={true}
                  scalesPageToFit={true}
                />
              )}
            </>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.background.secondary }]}>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: platformConfig.color }]}
            onPress={openInNativeApp}
          >
            <Icon name={isBlockedPlatform ? platformConfig.icon : 'open-outline'} size={fp(18)} color="#FFFFFF" />
            <Text style={styles.footerButtonText}>
              {getOpenButtonText()}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(16),
    paddingVertical: hp(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: wp(12),
  },
  platformBadge: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(10),
  },
  headerTitle: {
    fontSize: fp(16),
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: hp(12),
    fontSize: fp(14),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(20),
  },
  errorText: {
    marginTop: hp(12),
    fontSize: fp(16),
    textAlign: 'center',
  },
  retryButton: {
    marginTop: hp(16),
    paddingHorizontal: wp(24),
    paddingVertical: hp(10),
    borderRadius: ms(20),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fp(14),
    fontWeight: '600',
  },
  footer: {
    padding: wp(16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(14),
    borderRadius: ms(12),
    gap: wp(8),
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: fp(15),
    fontWeight: '600',
  },
  // Blocked platform styles (YouTube, Instagram, TikTok)
  blockedPlatformContainer: {
    flex: 1,
  },
  platformIconContainer: {
    width: '100%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformOverlay: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  youtubeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  youtubeThumbnail: {
    width: '100%',
    height: '60%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    backgroundColor: 'rgba(255,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  playText: {
    color: '#FFFFFF',
    fontSize: fp(14),
    marginTop: hp(16),
    fontWeight: '500',
  },
  videoInfoContainer: {
    padding: wp(20),
    flex: 1,
  },
  videoTitle: {
    fontSize: fp(18),
    fontWeight: '700',
    marginBottom: hp(8),
  },
  videoSubtitle: {
    fontSize: fp(14),
  },
});
