import type { LinearizedArticle } from "@/lib/articles/linearize"

import { unescapeHtml } from "./html-utils"
import type {
  BookPlan,
  ChapterContent,
  ChapterGroup,
  NumberedArticle,
} from "./types"

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
 * Group linearized articles into a recursively nested book plan. Articles are
 * numbered flat across the chapter ("3.2", "A.1") regardless of folder depth.
 */
export function buildBookPlan(articles: LinearizedArticle[]): BookPlan {
  const preface: NumberedArticle[] = []
  const chapters: ChapterGroup[] = []
  const chapterBySlug = new Map<string, ChapterGroup>()

  for (const raw of articles) {
    const article: LinearizedArticle = {
      ...raw,
      title: unescapeHtml(raw.title),
      chapterTitle: unescapeHtml(raw.chapterTitle),
      folders: raw.folders.map((folder) => ({
        slug: folder.slug,
        title: unescapeHtml(folder.title),
      })),
    }

    if (article.isPreface || !article.chapterSlug) {
      preface.push({ article, number: null })
      continue
    }

    let chapter = chapterBySlug.get(article.chapterSlug)
    if (!chapter) {
      chapter = {
        slug: article.chapterSlug,
        title: article.chapterTitle,
        isAppendix: article.isAppendix,
        number: "",
        content: [],
      }
      chapterBySlug.set(article.chapterSlug, chapter)
      chapters.push(chapter)
    }

    let content = chapter.content
    for (const folder of article.folders) {
      let folderContent = content.find(
        (item): item is Extract<ChapterContent, { kind: "folder" }> =>
          item.kind === "folder" && item.slug === folder.slug
      )
      if (!folderContent) {
        folderContent = {
          kind: "folder",
          slug: folder.slug,
          title: folder.title,
          content: [],
        }
        content.push(folderContent)
      }
      content = folderContent.content
    }

    content.push({ kind: "article", entry: { article, number: null } })
  }

  const orderedChapters = [
    ...chapters.filter((chapter) => !chapter.isAppendix),
    ...chapters.filter((chapter) => chapter.isAppendix),
  ]
  const numberedChapters: ChapterGroup[] = []
  let chapterCount = 0
  let appendixCount = 0
  for (const chapter of orderedChapters) {
    const chapterNumber = chapter.isAppendix
      ? appendixLetter(appendixCount++)
      : String(++chapterCount)
    let counter = 0

    function numberContent(content: ChapterContent[]): ChapterContent[] {
      const numberedContent: ChapterContent[] = []

      for (const item of content) {
        if (item.kind === "folder") {
          numberedContent.push({
            kind: "folder",
            slug: item.slug,
            title: item.title,
            content: numberContent(item.content),
          })
          continue
        }

        if (item.entry.article.isReadmeIntro) {
          numberedContent.push(item)
          continue
        }

        counter += 1
        numberedContent.push({
          kind: "article",
          entry: { ...item.entry, number: `${chapterNumber}.${counter}` },
        })
      }

      return numberedContent
    }

    numberedChapters.push({
      ...chapter,
      number: chapterNumber,
      content: numberContent(chapter.content),
    })
  }

  return { preface, chapters: numberedChapters }
}
