/**
 * Homepage motion constants for depth-based parallax effects
 * Defines layer weights, amplitudes, and blur ranges for desktop/mobile/reduced-motion
 */

export const HOMEPAGE_MOTION = {
  layers: {
    foreground: 1.2,
    midground: 0.5,
    background: 0.12,
  },

  blurMax: {
    foreground: 4,
    midground: 2,
    background: 1.5,
  },

  /** Pixel distance from mouse at which blur reaches blurMax */
  blurRadius: 768,

  desktop: {
    pointerAmplitude: 1.0,
  },

  mobile: {
    pointerAmplitude: 0.5,
  },

  reducedMotion: {
    pointerAmplitude: 0,
  },
} as const
