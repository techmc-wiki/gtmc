import type { PdfcnTheme } from "@/types/pdf-themes"

import { defaultPrimitives } from "@/lib/pdf-themes/primitives"

/**
 * The book is the reader surface, not an app surface: warm paper, dark ink,
 * and a single signal colour reserved for the apparatus. Values mirror the
 * site palette in `apps/web/lib/pdf/theme.ts` so the PDF and the site read as
 * one system.
 */
export const GTMC_COLORS = {
  paper: "#f5f4ef",
  surface: "#fcfbf8",
  ink: "#4a5468",
  inkDark: "#20283c",
  accent: "#c9cfdd",
  line: "#d6d3c8",
  signal: "#1d6a96",
  signalInk: "#f5f4ef",
} as const

/** Callout accents, kept clear of each other so severity reads at a glance. */
export const CALLOUT = {
  TIP: "#047857",
  IMPORTANT: GTMC_COLORS.signal,
  WARNING: "#b45309",
  CRASH: "#b91c1c",
  CORRUPTION: "#6d28d9",
  DEFAULT: GTMC_COLORS.ink,
} as const

export const gtmcTheme: PdfcnTheme = {
  name: "gtmc",
  primitives: defaultPrimitives,
  colors: {
    accent: GTMC_COLORS.accent,
    background: GTMC_COLORS.paper,
    border: GTMC_COLORS.line,
    destructive: CALLOUT.CRASH,
    foreground: GTMC_COLORS.ink,
    info: GTMC_COLORS.signal,
    muted: GTMC_COLORS.surface,
    mutedForeground: GTMC_COLORS.ink,
    primary: GTMC_COLORS.inkDark,
    primaryForeground: GTMC_COLORS.signalInk,
    success: CALLOUT.TIP,
    warning: CALLOUT.WARNING,
  },
  page: {
    orientation: "portrait",
    size: "A4",
  },
  spacing: {
    componentGap: 8,
    page: {
      marginBottom: 64,
      marginLeft: 64,
      marginRight: 64,
      marginTop: 64,
    },
    paragraphGap: 8,
    sectionGap: 20,
  },
  typography: {
    body: {
      fontFamily: "STIX Two Text",
      fontSize: 10.5,
      lineHeight: 1.55,
    },
    heading: {
      fontFamily: "STIX Two Text",
      fontSize: { h1: 30, h2: 19, h3: 14, h4: 12, h5: 11, h6: 10.5 },
      fontWeight: 600,
      lineHeight: 1.25,
    },
  },
}

/**
 * Font stacks. Every entry must be a family the renderer has registered:
 * unlike a browser, the PDF renderer resolves an uncovered codepoint only
 * against this chain and fails the render otherwise.
 */
export const FONT_STACKS = {
  /** Reading face: Latin serif, falling back to the Chinese serif. */
  serif: '"STIX Two Text", "Noto Serif SC", serif',
  /** Apparatus face: labels, captions, callout titles. */
  sans: '"Geist", "Noto Sans SC", sans-serif',
  /** Code face. The SC sans precedes it so CJK inside code still resolves. */
  mono: '"Geist Mono", "Noto Sans SC", monospace',
} as const
