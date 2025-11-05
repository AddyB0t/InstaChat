/**
 * Tags Screen
 * Manage article tags for categorization
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllTags, createTag, deleteTag, Tag } from '../services/database';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

const TagsScreen = () => {
  const { getColors, getFontSize, settings } = useTheme();
  const currentColors = getColors();
  const fontSizeStyle = (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl') => ({ fontSize: getFontSize(size), fontFamily: settings.fontFamily === 'serif' ? 'serif' : 'sans-serif' });

  const [tags, setTags] = useState<Tag[]>([]);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadTags();
    }, []),
  );

  const loadTags = async () => {
    const loaded = await getAllTags();
    setTags(loaded);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    try {
      await createTag(newTagName.trim());
      setNewTagName('');
      setShowNewTag(false);
      await loadTags();
    } catch (error) {
      Alert.alert('Error', 'Failed to create tag');
    }
  };

  const handleDeleteTag = (tagId: string) => {
    Alert.alert('Delete Tag', 'Are you sure you want to delete this tag?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          await deleteTag(tagId);
          await loadTags();
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.headerTitle, { color: currentColors.text }, fontSizeStyle('xxl')]}>Tags</Text>
      </View>

      {showNewTag && (
        <View style={[styles.createContainer, { backgroundColor: currentColors.surfaceLight, borderBottomColor: currentColors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: currentColors.surface, borderColor: currentColors.primary, color: currentColors.text }, fontSizeStyle('base')]}
            placeholder="Tag name..."
            placeholderTextColor={currentColors.textSecondary}
            value={newTagName}
            onChangeText={setNewTagName}
            autoFocus
          />
          <View style={styles.createActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: currentColors.surface }]}
              onPress={() => {
                setShowNewTag(false);
                setNewTagName('');
              }}
            >
              <Text style={[styles.cancelButtonText, { color: currentColors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.createButton, { backgroundColor: currentColors.primary }]} onPress={handleCreateTag}>
              <Text style={[styles.createButtonText, { color: currentColors.text }, fontSizeStyle('base')]}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!showNewTag && (
          <TouchableOpacity
            style={[styles.createTagButton, { backgroundColor: currentColors.primary }]}
            onPress={() => setShowNewTag(true)}
          >
            <Text style={[styles.createTagButtonText, { color: currentColors.text }, fontSizeStyle('base')]}>+ Create New Tag</Text>
          </TouchableOpacity>
        )}

        {tags.length === 0 && !showNewTag ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={[styles.emptyTitle, { color: currentColors.text }, fontSizeStyle('lg')]}>No tags yet</Text>
            <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }, fontSizeStyle('sm')]}>Add tags to your articles to organize them better</Text>
          </View>
        ) : (
          <View style={styles.tagsContainer}>
            {tags.map(tag => (
              <View key={tag.id} style={[styles.tagItem, { backgroundColor: currentColors.surfaceLight }]}>
                <View style={styles.tagContent}>
                  <Text style={styles.tagIcon}>🏷️</Text>
                  <View style={styles.tagInfo}>
                    <Text style={[styles.tagName, { color: currentColors.text }, fontSizeStyle('base')]}>{tag.name}</Text>
                    <Text style={[styles.tagCount, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>{tag.articleCount} articles</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: currentColors.error + '20' }]}
                  onPress={() => handleDeleteTag(tag.id)}
                >
                  <Text style={[styles.deleteButtonText, { color: currentColors.error }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  createContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.dark.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  input: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.dark.text,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
  },
  createActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.dark.textSecondary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  createButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dark.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.dark.text,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  createTagButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  createTagButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  tagsContainer: {
    gap: spacing.md,
  },
  tagItem: {
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  tagContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.md,
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  tagCount: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.error + '20',
  },
  deleteButtonText: {
    fontSize: fontSize.lg,
    color: colors.dark.error,
    fontWeight: fontWeight.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    textAlign: 'center',
  },
});

export default TagsScreen;
