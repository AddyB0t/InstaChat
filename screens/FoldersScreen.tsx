/**
 * Folders Screen
 * Manage article folders for organization
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
import { getAllFolders, createFolder, deleteFolder, Folder } from '../services/database';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

const FoldersScreen = () => {
  const { getColors, getFontSize, settings } = useTheme();
  const currentColors = getColors();
  const fontSizeStyle = (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl') => ({ fontSize: getFontSize(size), fontFamily: settings.fontFamily === 'serif' ? 'serif' : 'sans-serif' });
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadFolders();
    }, []),
  );

  const loadFolders = async () => {
    const loaded = await getAllFolders();
    setFolders(loaded);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    try {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
      await loadFolders();
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder');
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    Alert.alert('Delete Folder', 'Are you sure you want to delete this folder?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          await deleteFolder(folderId);
          await loadFolders();
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
        <Text style={[styles.headerTitle, { color: currentColors.text }, fontSizeStyle('xxl')]}>Folders</Text>
      </View>

      {showNewFolder && (
        <View style={[styles.createContainer, { backgroundColor: currentColors.surfaceLight, borderBottomColor: currentColors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: currentColors.surface, borderColor: currentColors.primary, color: currentColors.text }, fontSizeStyle('base')]}
            placeholder="Folder name..."
            placeholderTextColor={currentColors.textSecondary}
            value={newFolderName}
            onChangeText={setNewFolderName}
            autoFocus
          />
          <View style={styles.createActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: currentColors.surface }]}
              onPress={() => {
                setShowNewFolder(false);
                setNewFolderName('');
              }}
            >
              <Text style={[styles.cancelButtonText, { color: currentColors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.createButton, { backgroundColor: currentColors.primary }]} onPress={handleCreateFolder}>
              <Text style={[styles.createButtonText, { color: currentColors.text }, fontSizeStyle('base')]}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!showNewFolder && (
          <TouchableOpacity
            style={[styles.createFolderButton, { backgroundColor: currentColors.primary }]}
            onPress={() => setShowNewFolder(true)}
          >
            <Text style={[styles.createFolderButtonText, { color: currentColors.text }, fontSizeStyle('base')]}>+ Create New Folder</Text>
          </TouchableOpacity>
        )}

        {folders.length === 0 && !showNewFolder ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={[styles.emptyTitle, { color: currentColors.text }, fontSizeStyle('lg')]}>No folders yet</Text>
            <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }, fontSizeStyle('sm')]}>Create folders to organize your saved articles</Text>
          </View>
        ) : (
          <View style={styles.foldersGrid}>
            {folders.map(folder => (
              <View key={folder.id} style={[styles.folderItem, { backgroundColor: currentColors.surfaceLight }]}>
                <TouchableOpacity style={styles.folderContent}>
                  <Text style={styles.folderIcon}>📁</Text>
                  <Text style={[styles.folderName, { color: currentColors.text }, fontSizeStyle('base')]}>{folder.name}</Text>
                  <Text style={[styles.folderCount, { color: currentColors.textSecondary }, fontSizeStyle('xs')]}>{folder.articleCount} articles</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: currentColors.error + '20' }]}
                  onPress={() => handleDeleteFolder(folder.id)}
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
  createFolderButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  createFolderButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  foldersGrid: {
    gap: spacing.md,
  },
  folderItem: {
    backgroundColor: colors.dark.surfaceLight,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  folderContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    fontSize: fontSize.xxl,
    marginRight: spacing.md,
  },
  folderName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  folderCount: {
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

export default FoldersScreen;
