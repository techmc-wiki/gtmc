import fs from "node:fs"
import path from "node:path"

import { siteRoot } from "../workspace"

export type PdfLocale = "en" | "zh"

/** One manifest record. Only the fields the book needs are modelled. */
export interface ManifestEntry {
  slug: string
  titleByLocale: Record<string, string>
  availableLocales: string[]
  chapterTitleByLocale: Record<string, string>
  introTitleByLocale: Record<string, string>
  index: number
  isFolder: boolean
  isAppendix: boolean
  isPreface: boolean
}

export type Manifest = Record<string, ManifestEntry>

export function readManifest(): Manifest {
  const file = path.join(siteRoot(), "data", "manifest.json")
  return JSON.parse(fs.readFileSync(file, "utf8")) as Manifest
}

export interface BookArticle {
  slug: string
  title: string
  /**
   * Dotted running number, e.g. "1.2". Empty for an article that carries no
   * number of its own, such as the introduction that opens a chapter.
   */
  number: string
  html: string
}

export interface BookChapter {
  slug: string
  title: string
  number: string
  isAppendix: boolean
  articles: BookArticle[]
}

export interface BookPlan {
  preface: BookArticle[]
  chapters: BookChapter[]
}

/** An article this locale has content for, before it is numbered. */
interface PendingArticle {
  entry: ManifestEntry
  html: string
  /** False for a folder introduction, which opens its chapter unnumbered. */
  numbered: boolean
}

/** A chapter before it is numbered: its root, its articles, its appendices. */
interface ChapterDraft {
  root: ManifestEntry
  articles: PendingArticle[]
  /** Nodes inside this chapter that are appendices in their own right. */
  appendices: ManifestEntry[]
}

/** Sidecar filenames encode `/` as `~2F`. */
function sidecarName(slug: string): string {
  return `${slug.replace(/\//g, "~2F")}.html`
}

/** Spreadsheet-style letters, so appendices run A … Z, AA, AB. */
function appendixLetter(ordinal: number): string {
  let n = ordinal
  let out = ""
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/**
 * Builds the book's running order from the site manifest: preface first, then
 * chapters in manifest index order, with the appendices last. Articles inside a
 * chapter keep manifest order and sub-folders flatten into their parent. A
 * folder with an introduction of its own opens its chapter unnumbered, and a
 * node marked as an appendix becomes a chapter of its own at any depth.
 */
export function buildPlan(manifest: Manifest, locale: PdfLocale): BookPlan {
  const entries = Object.values(manifest)
  const localized = (record: Record<string, string>): string | undefined =>
    record[locale]

  const readHtml = (slug: string): string => {
    const file = path.join(
      siteRoot(),
      "data",
      "pdf-html",
      locale,
      sidecarName(slug)
    )
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
  }

  const titleOf = (entry: ManifestEntry): string =>
    localized(entry.titleByLocale) ??
    localized(entry.introTitleByLocale) ??
    entry.slug

  const childrenOf = (parent: string): ManifestEntry[] =>
    entries
      .filter(
        (entry) =>
          entry.slug.startsWith(`${parent}/`) &&
          !entry.slug.slice(parent.length + 1).includes("/")
      )
      .sort((a, b) => a.index - b.index)

  /**
   * Queues an article the locale actually has content for. The sidecar is what
   * filters, and filtering here rather than after numbering is what keeps a
   * partly translated chapter from numbering its survivors 1.1, 1.3.
   */
  const queue = (
    into: PendingArticle[],
    entry: ManifestEntry,
    numbered: boolean
  ): void => {
    const html = readHtml(entry.slug)
    if (html) into.push({ entry, html, numbered })
  }

  const articleOf = (pending: PendingArticle, number: string): BookArticle => ({
    slug: pending.entry.slug,
    title: titleOf(pending.entry),
    number,
    html: pending.html,
  })

  /** Adds what a folder contributes to its own chapter, in reading order. */
  const expandFolder = (
    folder: ManifestEntry,
    into: PendingArticle[]
  ): ManifestEntry[] => {
    // A folder's README is its introduction: it opens the chapter and carries
    // no number of its own.
    queue(into, folder, false)
    return childrenOf(folder.slug).flatMap((child) => expand(child, into))
  }

  /**
   * Adds what a node contributes to its own chapter, and hands back the
   * appendices inside it: a node marked as an appendix is a chapter of its own
   * at any depth, so it leaves the enclosing chapter rather than joining it.
   */
  const expand = (
    node: ManifestEntry,
    into: PendingArticle[]
  ): ManifestEntry[] => {
    if (node.isAppendix) return [node]
    if (node.isFolder) return expandFolder(node, into)
    queue(into, node, true)
    return []
  }

  /** One chapter's worth of content, rooted at a folder or a lone appendix. */
  const draftChapter = (root: ManifestEntry): ChapterDraft => {
    const articles: PendingArticle[] = []
    if (!root.isFolder) {
      queue(articles, root, true)
      return { root, articles, appendices: [] }
    }
    return { root, articles, appendices: expandFolder(root, articles) }
  }

  const preface: BookArticle[] = []
  const prefaceEntries = entries
    .filter(
      (entry) =>
        entry.isPreface &&
        !entry.isFolder &&
        entry.availableLocales.includes(locale)
    )
    .sort((a, b) => a.index - b.index)
  for (const entry of prefaceEntries) {
    const pending: PendingArticle[] = []
    queue(pending, entry, true)
    if (pending.length > 0) {
      preface.push(articleOf(pending[0], String(preface.length + 1)))
    }
  }

  const topLevel = entries
    .filter(
      (entry) =>
        !entry.isPreface &&
        !entry.slug.includes("/") &&
        entry.availableLocales.includes(locale)
    )
    .sort((a, b) => a.index - b.index)

  // Appendices close the book, so they are collected in reading order and
  // numbered after every ordinary chapter. An appendix may itself contain one.
  const drafts: ChapterDraft[] = []
  const appendixRoots: ManifestEntry[] = []
  for (const root of topLevel) {
    if (root.isAppendix) {
      appendixRoots.push(root)
      continue
    }
    const draft = draftChapter(root)
    appendixRoots.push(...draft.appendices)
    if (draft.articles.length > 0) drafts.push(draft)
  }
  for (let next = 0; next < appendixRoots.length; next += 1) {
    const draft = draftChapter(appendixRoots[next])
    appendixRoots.push(...draft.appendices)
    drafts.push(draft)
  }

  const chapters: BookChapter[] = []
  let chapterCount = 0
  let appendixCount = 0
  for (const draft of drafts) {
    const number = draft.root.isAppendix
      ? appendixLetter(appendixCount++)
      : String(++chapterCount)
    let articleCount = 0
    const articles = draft.articles.map((pending) =>
      articleOf(pending, pending.numbered ? `${number}.${++articleCount}` : "")
    )
    if (articles.length > 0) {
      chapters.push({
        slug: draft.root.slug,
        title:
          localized(draft.root.chapterTitleByLocale) ?? titleOf(draft.root),
        number,
        isAppendix: draft.root.isAppendix,
        articles,
      })
    }
  }

  return { preface, chapters }
}
