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
  /** Dotted running number, e.g. "1.2". */
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

/** Sidecar filenames encode `/` as `~2F`. */
function sidecarName(slug: string): string {
  return `${slug.replace(/\//g, "~2F")}.html`
}

/**
 * Builds the book's running order from the site manifest: preface first, then
 * chapters in manifest index order with the appendix last. Articles inside a
 * chapter keep manifest order and sub-folders flatten into their parent.
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

  /** Depth-first walk over a chapter subtree, numbering leaves in order. */
  const collect = (
    entry: ManifestEntry,
    prefix: string,
    counter: { value: number }
  ): BookArticle[] => {
    if (!entry.isFolder) {
      return [
        {
          slug: entry.slug,
          title: titleOf(entry),
          number: `${prefix}${++counter.value}`,
          html: readHtml(entry.slug),
        },
      ]
    }
    return childrenOf(entry.slug).flatMap((child) =>
      collect(child, prefix, counter)
    )
  }

  const preface: BookArticle[] = entries
    .filter(
      (entry) =>
        entry.isPreface &&
        !entry.isFolder &&
        entry.availableLocales.includes(locale)
    )
    .sort((a, b) => a.index - b.index)
    .flatMap((entry, position) => {
      const html = readHtml(entry.slug)
      if (!html) return []
      return [
        {
          slug: entry.slug,
          title: titleOf(entry),
          number: String(position + 1),
          html,
        },
      ]
    })

  const topLevel = entries
    .filter(
      (entry) =>
        !entry.isPreface &&
        !entry.slug.includes("/") &&
        entry.isFolder &&
        entry.availableLocales.includes(locale)
    )
    .sort((a, b) => {
      // The appendix closes the book, so it sorts after every chapter.
      if (a.isAppendix !== b.isAppendix) return a.isAppendix ? 1 : -1
      return a.index - b.index
    })

  const chapters: BookChapter[] = topLevel.map((entry, position) => {
    const counter = { value: 0 }
    return {
      slug: entry.slug,
      title: localized(entry.chapterTitleByLocale) ?? titleOf(entry),
      number: entry.isAppendix ? "A" : String(position + 1),
      isAppendix: entry.isAppendix,
      articles: collect(entry, `${position + 1}.`, counter).filter(
        (article) => article.html.length > 0
      ),
    }
  })

  return { preface, chapters }
}
