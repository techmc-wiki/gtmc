import type { LinearizedArticle } from "@/lib/articles/linearize"

import { unescapeHtml } from "./html-utils"
import type { BookPlan, ChapterGroup, NumberedArticle } from "./types"

function appendixLetter(ordinal: number): string {
  // 0 → "A", 1 → "B", … 26 → "AA" (defensive; real books stop well short)
  let n = ordinal
  let out = ""
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/**
 * Group linearized articles into a numbered book plan: preface entries stay
 * unnumbered up front, chapters are numbered 1..N, appendix chapters are
 * lettered A.., and articles get dotted numbers within their chapter
 * ("3.2", "A.1"). Synthetic README intros keep their position but carry no
 * number — they read as the chapter's untitled opening text.
 */
export function buildBookPlan(articles: LinearizedArticle[]): BookPlan {
  const preface: NumberedArticle[] = []
  const chapters: ChapterGroup[] = []
  const bySlug = new Map<string, ChapterGroup>()

  let chapterCount = 0
  let appendixCount = 0

  for (const raw of articles) {
    const article: LinearizedArticle = {
      ...raw,
      title: unescapeHtml(raw.title),
      chapterTitle: unescapeHtml(raw.chapterTitle),
    }

    if (article.isPreface || !article.chapterSlug) {
      // Preface flag or root-level article: unnumbered front matter
      preface.push({ article, number: null })
      continue
    }

    let chapter = bySlug.get(article.chapterSlug)
    if (!chapter) {
      const number = article.isAppendix
        ? appendixLetter(appendixCount++)
        : String(++chapterCount)
      chapter = {
        slug: article.chapterSlug,
        title: article.chapterTitle,
        isAppendix: article.isAppendix,
        number,
        articles: [],
      }
      bySlug.set(article.chapterSlug, chapter)
      chapters.push(chapter)
    }

    const numbered = chapter.articles.filter((a) => a.number !== null).length
    chapter.articles.push({
      article,
      number: article.isReadmeIntro
        ? null
        : `${chapter.number}.${numbered + 1}`,
    })
  }

  return { preface, chapters }
}
