import type { PdfcnTheme } from "@/types/pdf-themes"

import { defaultPrimitives } from "@/lib/pdf-themes/primitives"

/**
 * The book is printed as often as it is read on a screen, and only black on
 * bare paper is both cheap to print and faithful in a photocopy: a tinted
 * sheet prints as a gray, and a hue prints as its ink. So the palette is a
 * ramp of grays and nothing else, each value with one job.
 *
 * Losing colour means hierarchy has to be carried by weight and by the rules
 * that frame a block, which is how a printed page carries it anyway.
 */
export const GTMC_COLORS = {
  /** The sheet, and the fill of every block that sits on it. */
  paper: "#ffffff",
  surface: "#ffffff",
  /** Body copy and headings. */
  ink: "#000000",
  /** Furniture: folios, running heads, captions, quiet labels. */
  dim: "#4d4d4d",
  /** Hairlines, table rules, and the frame around a figure. */
  line: "#8a8a8a",
  /** The chapter numeral, which is set large enough to carry a light gray. */
  accent: "#767676",
} as const

/**
 * Body copy, in points. The renderer scales points to pixels, and math is
 * typeset at the same measure, so the two are named together.
 */
export const BODY_FONT_SIZE_PT = 10.5

export const gtmcTheme: PdfcnTheme = {
  name: "gtmc",
  primitives: defaultPrimitives,
  colors: {
    accent: GTMC_COLORS.accent,
    background: GTMC_COLORS.paper,
    border: GTMC_COLORS.line,
    destructive: GTMC_COLORS.ink,
    foreground: GTMC_COLORS.ink,
    info: GTMC_COLORS.ink,
    muted: GTMC_COLORS.paper,
    mutedForeground: GTMC_COLORS.dim,
    primary: GTMC_COLORS.ink,
    primaryForeground: GTMC_COLORS.paper,
    success: GTMC_COLORS.ink,
    warning: GTMC_COLORS.ink,
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
      fontSize: BODY_FONT_SIZE_PT,
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
