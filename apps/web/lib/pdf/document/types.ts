import type { LinearizedArticle } from "@/lib/articles/linearize"

export type PdfLocale = "en" | "zh"

export interface NumberedArticle {
  article: LinearizedArticle
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
  generatedDate: string
  articlesRevision?: string
  sourceUrl?: string
  hasMath?: boolean
  fontsHref?: string
  renderArticle: (article: LinearizedArticle) => Promise<string>
}
