import { StyleSheet } from "@/lib/pdf-primitives"

import { BODY_FONT_SIZE_PT, FONT_STACKS, GTMC_COLORS } from "../theme"
import { COLUMN_HEIGHT } from "../geometry"

/**
 * Book styles. Sizes are points, matching the pdfcn convention: the renderer
 * scales them to CSS pixels. Nothing here drops below 8pt.
 *
 * Monospace is reserved for values the reader compares rather than reads —
 * folios, revisions, URLs, article numbers. A label that names something is
 * set in the sans at sentence case: an uppercased monospace kicker reads as
 * machine output, which is not what a chapter or a cover is.
 */
export const bookStyles = StyleSheet.create({
  page: {
    backgroundColor: GTMC_COLORS.paper,
    color: GTMC_COLORS.ink,
    fontFamily: FONT_STACKS.serif,
    fontSize: BODY_FONT_SIZE_PT,
    lineHeight: 1.55,
    // Ragged-right body copy; hyphenation belongs to the renderer, and the
    // site sets `text-wrap: pretty` rather than justification.
    textAlign: "left",
  },

  // ── Labels ──────────────────────────────────────────────────────────────
  /** Monospace, for values the reader compares: revision, URL, folio. */
  apparatusQuiet: {
    fontFamily: FONT_STACKS.mono,
    fontSize: 8,
    letterSpacing: 0.06,
    color: GTMC_COLORS.dim,
  },

  // ── Cover ───────────────────────────────────────────────────────────────
  /**
   * The cover is placed by explicit offsets rather than by filling the page
   * and pushing the foot down. A container as tall as the page is the one box
   * in this book that can straddle a page boundary, and the foot is the child
   * that falls over it. Offsets are written in pixels because the numeric
   * properties below are points, which the renderer scales.
   */
  coverRoot: {
    display: "flex",
    flexDirection: "column",
  },
  coverBand: {
    height: 6,
    backgroundColor: GTMC_COLORS.ink,
  },
  coverBody: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    // A third of the way down, the way a title sits on a printed jacket.
    marginTop: `${Math.round(COLUMN_HEIGHT * 0.3)}px`,
  },
  coverTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.12,
    color: GTMC_COLORS.ink,
  },
  coverSubtitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 14,
    color: GTMC_COLORS.dim,
  },
  coverRule: {
    height: 1,
    backgroundColor: GTMC_COLORS.line,
  },
  coverTagline: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 11,
    fontStyle: "italic",
    color: GTMC_COLORS.dim,
  },
  coverFoot: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    // Far enough below the title block to sit near the foot of the page
    // without reaching it: the column is `COLUMN_HEIGHT` pixels tall.
    marginTop: `${Math.round(COLUMN_HEIGHT * 0.42)}px`,
  },
  /** The edition, stated once at the foot rather than shouted above the name. */
  coverEdition: {
    fontFamily: FONT_STACKS.sans,
    fontSize: 9,
    color: GTMC_COLORS.dim,
    marginBottom: 2,
  },

  // ── Table of contents ───────────────────────────────────────────────────
  tocTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 20,
    fontWeight: 600,
    color: GTMC_COLORS.ink,
    marginBottom: 14,
  },
  tocChapter: {
    marginTop: 12,
    marginBottom: 4,
  },
  tocChapterLabel: {
    fontFamily: FONT_STACKS.sans,
    fontSize: 8.5,
    letterSpacing: 0.06,
    color: GTMC_COLORS.ink,
  },
  tocChapterTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 13,
    fontWeight: 600,
    color: GTMC_COLORS.ink,
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
    color: GTMC_COLORS.dim,
    minWidth: 18,
  },
  tocText: {
    fontFamily: FONT_STACKS.serif,
    fontSize: BODY_FONT_SIZE_PT,
    color: GTMC_COLORS.ink,
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
    color: GTMC_COLORS.dim,
    minWidth: 26,
    textAlign: "right",
  },

  // ── Chapter opener ──────────────────────────────────────────────────────
  chapterOpener: {
    display: "flex",
    flexDirection: "column",
    // `breakBefore` is what gives a chapter a page of its own. The opener
    // must not also fill that page: the first article breaks too, so a
    // full-height opener would leave a blank one between them. The offset is
    // a pixel string, because the numeric properties here are points.
    breakBefore: "page",
    paddingTop: `${Math.round(COLUMN_HEIGHT * 0.18)}px`,
    gap: 10,
  },
  chapterKicker: {
    fontFamily: FONT_STACKS.sans,
    fontSize: 9,
    letterSpacing: 0.08,
    color: GTMC_COLORS.ink,
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
    color: GTMC_COLORS.ink,
  },
  chapterContents: {
    marginTop: 10,
    maxWidth: 320,
  },
  chapterContentsLabel: {
    fontFamily: FONT_STACKS.sans,
    fontSize: 8.5,
    letterSpacing: 0.06,
    color: GTMC_COLORS.dim,
    marginBottom: 5,
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
  /** The article title, with a rule under it to close the head. */
  articleHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: GTMC_COLORS.line,
  },
  articleTitle: {
    fontFamily: FONT_STACKS.serif,
    fontSize: 17,
    fontWeight: 600,
    lineHeight: 1.25,
    color: GTMC_COLORS.ink,
  },

  // ── Colophon ────────────────────────────────────────────────────────────
  colophon: {
    breakBefore: "page",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
})

