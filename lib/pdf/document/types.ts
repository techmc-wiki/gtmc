import type { LinearizedArticle } from "@/lib/articles/linearize"

export type PdfLocale = "en" | "zh"

export interface NumberedArticle {
  article: LinearizedArticle
  /** Dotted article number ("3.2", "A.1") or null for unnumbered entries. */
  number: string | null
}

export type ChapterContent =
  | {
      kind: "folder"
      slug: string
      title: string
      content: ChapterContent[]
    }
  | {
      kind: "article"
      entry: NumberedArticle
    }

export interface ChapterGroup {
  slug: string
  title: string
  isAppendix: boolean
  /** Chapter numeral: "1", "2", … or "A", "B", … for appendices. */
  number: string
  content: ChapterContent[]
}

export interface BookPlan {
  preface: NumberedArticle[]
  chapters: ChapterGroup[]
}

function flattenChapterContent(content: ChapterContent[]): NumberedArticle[] {
  return content.flatMap((item) =>
    item.kind === "article" ? [item.entry] : flattenChapterContent(item.content)
  )
}

export function chapterArticles(chapter: ChapterGroup): NumberedArticle[] {
  return flattenChapterContent(chapter.content)
}

export interface BookOptions {
  title: string
  subtitle?: string
  tagline?: string
  locale: PdfLocale
  /** ISO date (YYYY-MM-DD) shown on the cover and colophon. */
  generatedDate: string
  /** Short commit hash of the articles submodule checkout. */
  articlesRevision?: string
  sourceUrl?: string
  hasMath?: boolean
  renderArticle: (article: LinearizedArticle) => Promise<string>
}
