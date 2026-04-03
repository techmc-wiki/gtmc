import matter from "gray-matter"

export interface FrontMatterData {
  title?: string
  chapterTitle?: string
  chapterTitleEn?: string
  introTitle?: string
  introTitleEn?: string
  author?: string
  coAuthors?: string
  date?: string
  lastmod?: string
  index: number
  isAdvanced?: boolean
}

export function parseFrontMatter(content: string): FrontMatterData {
  try {
    const { data } = matter(content)

    const title =
      data.title && typeof data.title === "string"
        ? data.title.trim() || ""
        : undefined
    const chapterTitle =
      data["chapter-title"] && typeof data["chapter-title"] === "string"
        ? data["chapter-title"].trim() || ""
        : undefined
    const chapterTitleEn =
      data["chapter-title-en"] && typeof data["chapter-title-en"] === "string"
        ? data["chapter-title-en"].trim() || ""
        : undefined
    const introTitle =
      data["intro-title"] && typeof data["intro-title"] === "string"
        ? data["intro-title"].trim() || ""
        : undefined
    const introTitleEn =
      data["intro-title-en"] && typeof data["intro-title-en"] === "string"
        ? data["intro-title-en"].trim() || ""
        : undefined
    const author =
      data.author && typeof data.author === "string"
        ? data.author.trim() || ""
        : undefined
    const coAuthors =
      data["co-authors"] && typeof data["co-authors"] === "string"
        ? data["co-authors"].trim() || ""
        : undefined
    const date =
      data.date && typeof data.date === "string"
        ? data.date.trim() || ""
        : undefined
    const lastmod =
      data.lastmod && typeof data.lastmod === "string"
        ? data.lastmod.trim() || ""
        : undefined

    let index = -1
    if (typeof data.index === "number" && Number.isInteger(data.index)) {
      index = data.index
    } else if (typeof data.index === "string") {
      const parsed = parseInt(data.index, 10)
      if (!isNaN(parsed)) {
        index = parsed
      }
    }

    const isAdvanced = data["is-advanced"] === true

    return {
      title,
      chapterTitle,
      chapterTitleEn,
      introTitle,
      introTitleEn,
      author,
      coAuthors,
      date,
      lastmod,
      index,
      isAdvanced,
    }
  } catch {
    return { index: -1 }
  }
}
