import type { LinearizedArticle } from "@/lib/articles/linearize"

export interface EbookOptions {
  /** Display title of the ebook */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Collection metadata (author, version, date) */
  meta?: Record<string, string>
  /** Linearized articles in display order */
  articles: LinearizedArticle[]
  /** Locale for UI chrome labels */
  locale?: "en" | "zh"
  /** Whether to include KaTeX CSS */
  hasMath?: boolean
  /** Callback to render each article's markdown content to HTML.
   *  If not provided, a default handler reads from disk and renders via
   *  renderMarkdownToHtml(). */
  renderArticle?: (article: LinearizedArticle) => Promise<string>
}

export interface EbookSection {
  type:
    | "cover"
    | "toc"
    | "preface"
    | "chapter-intro"
    | "chapter-article"
    | "appendix-intro"
    | "appendix-article"
  title: string
  htmlContent: string
  slug?: string
}
