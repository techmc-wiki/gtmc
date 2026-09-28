import { StyleSheet } from "@/lib/pdf-primitives"

import { CALLOUT, FONT_STACKS, GTMC_COLORS } from "../theme"

/**
 * Book styles. Sizes are points, matching the pdfcn convention: the renderer
 * scales them to CSS pixels. Nothing here drops below 9pt, and the apparatus
 * scale stays mono-uppercase-wide-tracked, matching the site.
 */
export const bookStyles = StyleSheet.create({
  page: {
    backgroundColor: GTMC_COLORS.paper,
    color: GTMC_COLORS.ink,
    fontFamily: FONT_STACKS.serif,
    fontSize: 10.5,
    lineHeight: 1.55,
    // Ragged-right body copy; hyphenation belongs to the renderer, and the
    // site sets `text-wrap: pretty` rather than justification.
    textAlign: "left",
  },

  // ── Apparatus ───────────────────────────────────────────────────────────
  /** Mono, uppercase, wide tracking. Reserved for the book's apparatus. */
  apparatus: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    letterSpacing: 0.12,
    textTransform: "uppercase",
    color: GTMC_COLORS.ink,
  },
  apparatusQuiet: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    letterSpacing: 0.08,
    color: GTMC_COLORS.ink,
  },

  // ── Cover ───────────────────────────────────────────────────────────────
  /**
   * The wordmark is set in the display serif, not the apparatus face.
   * Monospace, uppercase, and wide tracking belong to controls and running
   * furniture; a full-capital mono wordmark reads as a label rather than a
   * name, and the cover is the one place the name has to carry.
   */
  coverWordmark: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.04,
    color: GTMC_COLORS.signal,
  },
  coverRoot: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100vh",
    paddingTop: 8,
  },
  coverBand: {
    height: 6,
    backgroundColor: GTMC_COLORS.signal,
  },
  coverBody: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  coverTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.12,
    color: GTMC_COLORS.inkDark,
  },
  coverSubtitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 14,
    color: GTMC_COLORS.ink,
  },
  coverRule: {
    height: 1,
    backgroundColor: GTMC_COLORS.line,
  },
  coverTagline: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 11,
    fontStyle: "italic",
    color: GTMC_COLORS.ink,
  },
  coverFoot: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  // ── Table of contents ───────────────────────────────────────────────────
  tocTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 20,
    fontWeight: 600,
    color: GTMC_COLORS.inkDark,
    marginBottom: 14,
  },
  tocChapter: {
    marginTop: 12,
    marginBottom: 4,
  },
  tocChapterLabel: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    letterSpacing: 0.12,
    textTransform: "uppercase",
    color: GTMC_COLORS.signal,
  },
  tocChapterTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 13,
    fontWeight: 600,
    color: GTMC_COLORS.inkDark,
  },
  /** One row: number, title, dot leader, folio. */
  tocRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingTop: 2,
    paddingBottom: 2,
  },
  tocNum: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    color: GTMC_COLORS.ink,
    minWidth: 18,
  },
  tocText: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 10.5,
    color: GTMC_COLORS.inkDark,
  },
  /** Stretched rule that draws the leader between title and folio. */
  tocLeader: {
    flexGrow: 1,
    borderBottomWidth: 1,
    borderBottomStyle: "dotted",
    borderBottomColor: GTMC_COLORS.line,
  },
  /** Reserved so a folio digit never widens the row and moves a page break. */
  tocFolio: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    color: GTMC_COLORS.ink,
    minWidth: 26,
    textAlign: "right",
  },

  // ── Chapter opener ──────────────────────────────────────────────────────
  chapterOpener: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    // A chapter opens on a page of its own; `100vh` alone would let the opener
    // start wherever the previous article happened to end.
    breakBefore: "page",
    height: "100vh",
    gap: 10,
  },
  chapterKicker: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    letterSpacing: 0.12,
    textTransform: "uppercase",
    color: GTMC_COLORS.signal,
  },
  chapterNumeral: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 52,
    fontWeight: 700,
    lineHeight: 1,
    color: GTMC_COLORS.accent,
  },
  chapterTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 26,
    fontWeight: 600,
    lineHeight: 1.2,
    color: GTMC_COLORS.inkDark,
  },
  chapterContents: {
    marginTop: 10,
    maxWidth: 320,
  },
  chapterContentsLabel: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    letterSpacing: 0.12,
    textTransform: "uppercase",
    color: GTMC_COLORS.ink,
    marginBottom: 4,
  },
  chapterListRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingTop: 1,
    paddingBottom: 1,
  },

  // ── Article ─────────────────────────────────────────────────────────────
  article: {
    breakBefore: "page",
  },
  articleHeader: {
    marginBottom: 12,
  },
  articleNumber: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    letterSpacing: 0.12,
    textTransform: "uppercase",
    color: GTMC_COLORS.signal,
    marginBottom: 3,
  },
  articleTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 17,
    fontWeight: 600,
    lineHeight: 1.25,
    color: GTMC_COLORS.inkDark,
  },

  // ── Colophon ────────────────────────────────────────────────────────────
  colophon: {
    breakBefore: "page",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
})

/** Callout accent keyed by the article's `data-callout` value. */
export function calloutColor(kind: string | undefined): string {
  if (!kind) return CALLOUT.DEFAULT
  return CALLOUT[kind as keyof typeof CALLOUT] ?? CALLOUT.DEFAULT
}
