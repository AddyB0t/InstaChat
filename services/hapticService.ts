/**
 * Haptic Feedback Service
 * Centralized haptic feedback patterns for consistent UX
 */

import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const Haptic = {
  /**
   * Light feedback - for touch/drag start, button hover
   */
  light: () => {
    ReactNativeHapticFeedback.trigger('impactLight', options);
  },

  /**
   * Medium feedback - for selections, toggle state changes
   */
  medium: () => {
    ReactNativeHapticFeedback.trigger('impactMedium', options);
  },

  /**
   * Heavy feedback - for confirmations, major actions
   */
  heavy: () => {
    ReactNativeHapticFeedback.trigger('impactHeavy', options);
  },

  /**
   * Success pattern - for save, priority, positive actions
   */
  success: () => {
    ReactNativeHapticFeedback.trigger('notificationSuccess', options);
  },

  /**
   * Warning pattern - for skip, delete, negative actions
   */
  warning: () => {
    ReactNativeHapticFeedback.trigger('notificationWarning', options);
  },

  /**
   * Error pattern - for failed actions
   */
  error: () => {
    ReactNativeHapticFeedback.trigger('notificationError', options);
  },

  /**
   * Selection change - for toggles, switches, radio buttons
   */
  selection: () => {
    ReactNativeHapticFeedback.trigger('selection', options);
  },

  /**
   * Soft impact - very subtle feedback
   */
  soft: () => {
    ReactNativeHapticFeedback.trigger('soft', options);
  },

  /**
   * Rigid impact - sharp, defined feedback
   */
  rigid: () => {
    ReactNativeHapticFeedback.trigger('rigid', options);
  },
};

export default Haptic;
