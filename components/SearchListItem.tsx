/**
 * SearchListItem Component
 * List item for the search screen showing article preview
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Article } from '../services/database';
import { PlatformBadge } from './PlatformBadge';

interface SearchListItemProps {
  article: Article;
  onPress: (article: Article) => void;
  isDark?: boolean;
}

export const SearchListItem: React.FC<SearchListItemProps> = ({
  article,
  onPress,
  isDark = false,
}) => {
  const formattedDate = new Date(article.savedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[styles.container, isDark && styles.containerDark]}
      onPress={() => onPress(article)}
      activeOpacity={0.7}
    >
      {/* Platform Color Accent Bar */}
      {article.platformColor && (
        <View
          style={[styles.accentBar, { backgroundColor: article.platformColor }]}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Left: Thumbnail */}
        <View style={styles.left}>
          {article.imageUrl ? (
            <Image
              source={{ uri: article.imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.placeholder, isDark && styles.placeholderDark]}>
              <Text style={styles.placeholderIcon}>📄</Text>
            </View>
          )}
        </View>

        {/* Right: Info */}
        <View style={styles.right}>
          {/* Title */}
          <Text
            style={[styles.title, isDark && styles.titleDark]}
            numberOfLines={2}
          >
            {article.title}
          </Text>

          {/* Description */}
          {(article.aiSummary || article.summary) && (
            <Text
              style={[styles.description, isDark && styles.descriptionDark]}
              numberOfLines={2}
            >
              {article.aiSummary || article.summary}
            </Text>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {article.tags.slice(0, 3).map((tag, idx) => (
                <View
                  key={idx}
                  style={[styles.tag, isDark && styles.tagDark]}
                >
                  <Text
                    style={[styles.tagText, isDark && styles.tagTextDark]}
                  >
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer: Platform & Date */}
          <View style={styles.footer}>
            {article.platform && (
              <PlatformBadge platform={article.platform} size="small" />
            )}
            <Text style={[styles.date, isDark && styles.dateDark]}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  containerDark: {
    backgroundColor: '#1A1A1A',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    paddingLeft: 16,
    gap: 12,
  },
  left: {
    width: 80,
    height: 80,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderDark: {
    backgroundColor: '#2A2A2A',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  right: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  descriptionDark: {
    color: '#9CA3AF',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagDark: {
    backgroundColor: '#2A2A2A',
  },
  tagText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '600',
  },
  tagTextDark: {
    color: '#9CA3AF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  dateDark: {
    color: '#6B7280',
  },
});
