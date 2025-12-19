/**
 * Gradient definitions for the app
 * Dynamic backgrounds that cycle through different color combinations
 */

export interface GradientConfig {
  colors: string[];
  start: { x: number; y: number };
  end: { x: number; y: number };
  name: string;
}

export const GRADIENTS: GradientConfig[] = [
  {
    name: 'Sunset',
    colors: ['#FFB6C1', '#FFF59D'], // pink to yellow
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    name: 'Ocean',
    colors: ['#81D4FA', '#A5D6A7'], // blue to green
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    name: 'Purple Dream',
    colors: ['#CE93D8', '#FFAB91'], // purple to orange
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    name: 'Pink Sky',
    colors: ['#90CAF9', '#F48FB1'], // blue to pink
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    name: 'Lavender',
    colors: ['#E1BEE7', '#B2DFDB'], // lavender to mint
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    name: 'Peach',
    colors: ['#FFCCBC', '#FFF9C4'], // peach to cream
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
];

/**
 * Get a gradient by index (cycles through available gradients)
 */
export const getGradientByIndex = (index: number): GradientConfig => {
  return GRADIENTS[index % GRADIENTS.length];
};

/**
 * Get a random gradient
 */
export const getRandomGradient = (): GradientConfig => {
  const randomIndex = Math.floor(Math.random() * GRADIENTS.length);
  return GRADIENTS[randomIndex];
};
