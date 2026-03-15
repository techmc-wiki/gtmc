/**
 * Homepage motion constants for depth-based parallax effects
 * Defines layer weights, amplitudes, and blur ranges for desktop/mobile/reduced-motion
 */

export const HOMEPAGE_MOTION = {
  // Depth layer weights (0-1 scale)
  layers: {
    foreground: 0.8,
    midground: 0.5,
    background: 0.2,
  },

  // Desktop configuration
  desktop: {
    pointerAmplitude: 1.0,
    scrollAmplitude: 0.6,
    blurRange: {
      min: 0,
      max: 8,
    },
  },

  // Mobile configuration
  mobile: {
    pointerAmplitude: 0.5,
    scrollAmplitude: 0.3,
    blurRange: {
      min: 0,
      max: 4,
    },
  },

  // Reduced motion configuration (respects prefers-reduced-motion)
  reducedMotion: {
    pointerAmplitude: 0,
    scrollAmplitude: 0,
    blurRange: {
      min: 0,
      max: 0,
    },
  },
} as const;
