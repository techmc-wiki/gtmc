/**
 * GTMC theme palettes — light and dark token maps.
 *
 * Runtime source of truth is CSS variables in app/globals.css.
 * This file exists for documentation and programmatic access.
 *
 * Light: "Print Edition" — archival paper, navy-black ink, blueprint-azure signal.
 * Dark: "Blueprint" — cool blue-slate drafting ground, cool slate ink, luminous cyan signal.
 */

export const lightPalette = {
  "tech-bg": "#f5f4ef",
  "tech-main": "#4a5468",
  "tech-main-dark": "#20283c",
  "tech-accent": "#c9cfdd",
  "tech-line": "#d6d3c8",
  "tech-advanced": "#8c2f39",
  "tech-signal": "#1d6a96",
  surface: "#fcfbf8",
  "surface-overlay": "#fcfbf8",
  "surface-input": "#fffefb",
  "surface-modal": "#fcfbf8",
} as const

export const darkPalette = {
  "tech-bg": "#101826",
  "tech-main": "#9aa7bd",
  "tech-main-dark": "#e7ecf4",
  "tech-accent": "#2a3852",
  "tech-line": "#243248",
  "tech-advanced": "#c25664",
  "tech-signal": "#5fb0d4",
  surface: "#162031",
  "surface-overlay": "#1a2536",
  "surface-input": "#0c121d",
  "surface-modal": "#18222f",
} as const

export type TokenName = keyof typeof lightPalette
