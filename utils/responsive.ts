/**
 * Responsive utility for dynamic sizing across different screen sizes
 * Based on a base design width of 375 (iPhone SE/small phone)
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (design reference - small phone)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale a value based on screen width
 * Use for horizontal dimensions (width, paddingHorizontal, marginHorizontal)
 */
export const wp = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Scale a value based on screen height
 * Use for vertical dimensions (height, paddingVertical, marginVertical)
 */
export const hp = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Scale font size based on screen width with a moderate scale factor
 * Prevents fonts from getting too large on big screens
 */
export const fp = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * Math.min(scale, 1.3); // Cap scaling at 1.3x
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Moderate scale - for elements that should scale but not too aggressively
 * Good for icons, buttons, spacing
 */
export const ms = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size + (scale - 1) * size * factor));
};

/**
 * Get percentage of screen width
 */
export const widthPercent = (percent: number): number => {
  return (SCREEN_WIDTH * percent) / 100;
};

/**
 * Get percentage of screen height
 */
export const heightPercent = (percent: number): number => {
  return (SCREEN_HEIGHT * percent) / 100;
};

// Screen dimensions
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

// Detect if small screen (width < 380)
export const isSmallScreen = SCREEN_WIDTH < 380;

// Detect if large screen (width > 420)
export const isLargeScreen = SCREEN_WIDTH > 420;
