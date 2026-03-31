import matter from "gray-matter"

export interface FrontMatterData {
  title?: string
  introTitle?: string
  index: number
}

export function parseFrontMatter(content: string): FrontMatterData {
  try {
    const { data } = matter(content)

    const title =
      data.title && typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : undefined
    const introTitle =
      data["intro-title"] && typeof data["intro-title"] === "string"
        ? data["intro-title"]
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

    return { title, introTitle, index }
  } catch {
    return { index: -1 }
  }
}
