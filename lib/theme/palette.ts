/**
 * GTMC theme palettes — light and dark token maps.
 *
 * Runtime source of truth is CSS variables in app/globals.css.
 * This file exists for documentation and programmatic access.
 *
 * Light: "Print Edition" — archival paper, navy-black ink, Springer yellow.
 * Dark: "Night Print" — warm lamp-lit dark paper, cream ink.
 */

export const lightPalette = {
  "tech-bg": "#f5f4ef",
  "tech-main": "#4a5468",
  "tech-main-dark": "#20283c",
  "tech-accent": "#c9cfdd",
  "tech-line": "#d6d3c8",
  "tech-advanced": "#4c5b96",
  "tech-signal": "#e3b505",
  surface: "#fcfbf8",
  "surface-overlay": "#fcfbf8",
  "surface-input": "#fffefb",
  "surface-modal": "#fcfbf8",
} as const

export const darkPalette = {
  "tech-bg": "#14120d",
  "tech-main": "#a8a290",
  "tech-main-dark": "#ece6d6",
  "tech-accent": "#3d3a2f",
  "tech-line": "#2d2a21",
  "tech-advanced": "#9aa6d4",
  "tech-signal": "#e9c531",
  surface: "#1c1912",
  "surface-overlay": "#221f16",
  "surface-input": "#121009",
  "surface-modal": "#201d15",
} as const

export type TokenName = keyof typeof lightPalette
