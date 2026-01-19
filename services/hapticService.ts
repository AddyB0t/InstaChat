/**
 * Haptic Feedback Service
 * Centralized haptic feedback patterns for consistent UX
 */

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Platform, Vibration } from 'react-native';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// Safe trigger with fallback to native Vibration API
const safeTrigger = (type: string) => {
  try {
    ReactNativeHapticFeedback.trigger(type as any, options);
  } catch (error) {
    // Fallback to basic vibration on Android
    if (Platform.OS === 'android') {
      Vibration.vibrate(10);
    }
    console.log('[Haptic] Error triggering haptic:', error);
  }
};

export const Haptic = {
  /**
   * Light feedback - for touch/drag start, button hover
   */
  light: () => safeTrigger('impactLight'),

  /**
   * Medium feedback - for selections, toggle state changes
   */
  medium: () => safeTrigger('impactMedium'),

  /**
   * Heavy feedback - for confirmations, major actions
   */
  heavy: () => safeTrigger('impactHeavy'),

  /**
   * Success pattern - for save, priority, positive actions
   */
  success: () => safeTrigger('notificationSuccess'),

  /**
   * Warning pattern - for skip, delete, negative actions
   */
  warning: () => safeTrigger('notificationWarning'),

  /**
   * Error pattern - for failed actions
   */
  error: () => safeTrigger('notificationError'),

  /**
   * Selection change - for toggles, switches, radio buttons
   */
  selection: () => safeTrigger('selection'),

  /**
   * Soft impact - very subtle feedback
   */
  soft: () => safeTrigger('soft'),

  /**
   * Rigid impact - sharp, defined feedback
   */
  rigid: () => safeTrigger('rigid'),
};

export default Haptic;
