/**
 * GTMC theme palettes — light and dark token maps.
 *
 * Runtime source of truth is CSS variables in app/globals.css.
 * This file exists for documentation and programmatic access.
 *
 * Dark palette: Candidate A — Deep Blueprint Navy (brand-consistent)
 */

export const lightPalette = {
  "tech-bg": "#f8f9fc",
  "tech-main": "#60708f",
  "tech-main-dark": "#4a5a78",
  "tech-accent": "#c4d0df",
  "tech-line": "#cbd5e1",
  "tech-advanced": "#4c5b96",
  surface: "#ffffff",
  "surface-overlay": "#ffffff",
  "surface-input": "#ffffff",
  "surface-modal": "#ffffff",
} as const

export const darkPalette = {
  "tech-bg": "#0e1525",
  "tech-main": "#a4b2cc",
  "tech-main-dark": "#cfd8e6",
  "tech-accent": "#3a4866",
  "tech-line": "#2a3349",
  "tech-advanced": "#7a89c4",
  surface: "#152038",
  "surface-overlay": "#1c2a4a",
  "surface-input": "#0f1a2e",
  "surface-modal": "#1a2540",
} as const

export type TokenName = keyof typeof lightPalette
