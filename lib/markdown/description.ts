import { remark } from "remark"
import stripMarkdown from "strip-markdown"
import { stripAnsiColorMarkup } from "@/lib/markdown/ansi-colors"

/** Typical Bing/Google SERP target: long enough to be informative, short enough not to truncate. */
export const META_DESCRIPTION_MAX_LENGTH = 155
/** Below this, Bing Webmaster often flags the description as "too short". */
export const META_DESCRIPTION_MIN_LENGTH = 120

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const budget = maxLength - 1
  const truncated = text.slice(0, budget)
  const minBreak = Math.floor(budget * 0.75)
  const lastSpace = truncated.lastIndexOf(" ")
  if (lastSpace >= minBreak) {
    return truncated.slice(0, lastSpace) + "…"
  }
  const punctMatch = truncated.match(/.*[。！？；，、.!?;,]/u)
  if (punctMatch && punctMatch[0].length >= minBreak) {
    return punctMatch[0] + "…"
  }
  return truncated + "…"
}

function toPlainText(markdownFragment: string): string {
  return remark()
    .use(stripMarkdown)
    .processSync(markdownFragment)
    .toString()
    .replaceAll(/\^\[?\d+\]?/g, "")
    .replaceAll(/~~+/g, "")
    .replaceAll(/\s+/g, " ")
    .trim()
}

function isSkipLine(trimmed: string, inCodeFence: boolean): boolean {
  if (inCodeFence) return true
  if (!trimmed) return true
  if (trimmed.startsWith("#")) return true
  if (trimmed.startsWith("![")) return true
  if (trimmed.startsWith(">")) return true
  if (trimmed.startsWith("<")) return true
  if (trimmed === "---" || trimmed === "***" || trimmed === "___") return true
  return false
}

function isListItem(trimmed: string): boolean {
  return /^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)
}

function stripListMarker(trimmed: string): string {
  return trimmed.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "")
}

export function generateDescription(
  markdown: string,
  frontmatterDescription?: string,
  maxLength: number = META_DESCRIPTION_MAX_LENGTH,
  minLength: number = META_DESCRIPTION_MIN_LENGTH
): string {
  const normalizedMarkdown = stripAnsiColorMarkup(markdown)
  const parts: string[] = []

  const frontmatter = frontmatterDescription?.trim()
  if (frontmatter) {
    parts.push(frontmatter)
    if (toPlainText(frontmatter).length >= minLength) {
      return truncateAtWord(toPlainText(frontmatter), maxLength)
    }
  }

  const lines = normalizedMarkdown.split("\n")
  let lineIndex = 0

  // Skip leading YAML frontmatter block
  if (lines[0]?.trim() === "---") {
    lineIndex = 1
    while (lineIndex < lines.length && lines[lineIndex]?.trim() !== "---") {
      lineIndex++
    }
    if (lineIndex < lines.length) lineIndex++ // Skip closing ---
  }

  let inCodeFence = false

  while (lineIndex < lines.length) {
    const joined = parts.join(" ")
    if (toPlainText(joined).length >= minLength) break

    const line = lines[lineIndex]
    const trimmed = line.trim()

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence
      lineIndex++
      continue
    }

    if (isSkipLine(trimmed, inCodeFence)) {
      lineIndex++
      continue
    }

    // List items: useful when an article opens with an outline
    if (isListItem(trimmed)) {
      const listBits: string[] = []
      while (lineIndex < lines.length) {
        const currentTrimmed = lines[lineIndex].trim()
        if (currentTrimmed.startsWith("```")) break
        if (!currentTrimmed) break
        if (!isListItem(currentTrimmed)) break
        if (
          currentTrimmed.startsWith("#") ||
          currentTrimmed.startsWith("![") ||
          currentTrimmed.startsWith(">") ||
          currentTrimmed.startsWith("<")
        ) {
          break
        }
        listBits.push(stripListMarker(currentTrimmed))
        lineIndex++
        if (
          toPlainText([...parts, ...listBits].join(" ")).length >= minLength
        ) {
          break
        }
      }
      if (listBits.length > 0) {
        parts.push(listBits.join("; "))
      }
      continue
    }

    // Contiguous prose paragraph
    const paragraphLines: string[] = []
    while (lineIndex < lines.length) {
      const currentLine = lines[lineIndex]
      const currentTrimmed = currentLine.trim()

      if (
        !currentTrimmed ||
        currentTrimmed.startsWith("#") ||
        currentTrimmed.startsWith("![") ||
        currentTrimmed.startsWith(">") ||
        currentTrimmed.startsWith("<") ||
        currentTrimmed === "---" ||
        currentTrimmed === "***" ||
        currentTrimmed === "___" ||
        isListItem(currentTrimmed) ||
        currentTrimmed.startsWith("```")
      ) {
        break
      }

      paragraphLines.push(currentLine)
      lineIndex++
    }

    if (paragraphLines.length > 0) {
      parts.push(paragraphLines.join("\n"))
    }
  }

  if (parts.length === 0) return ""

  const plainText = toPlainText(parts.join("\n\n"))
  if (!plainText) return ""

  return truncateAtWord(plainText, maxLength)
}

function looksMostlyCjk(text: string): boolean {
  const letters = text.replaceAll(/\s+/g, "")
  if (!letters) return false
  const cjk = letters.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0
  return cjk / letters.length >= 0.3
}

export function ensureMetaDescriptionLength(
  description: string,
  context: {
    title: string
    chapterTitle?: string | null
    siteName?: string
    locale?: string
  },
  maxLength: number = META_DESCRIPTION_MAX_LENGTH,
  minLength: number = META_DESCRIPTION_MIN_LENGTH
): string {
  const siteName = context.siteName ?? "Graduate Texts in Minecraft"
  const title = context.title.trim()
  const chapter = context.chapterTitle?.trim()
  let result = description.trim()
  const isZh =
    context.locale === "zh" ||
    looksMostlyCjk(`${result} ${title} ${chapter ?? ""}`)

  if (result.length >= minLength) {
    return truncateAtWord(result, maxLength)
  }

  const contextBits = [title, chapter].filter((bit): bit is string =>
    Boolean(bit && bit.length > 0)
  )

  for (const bit of contextBits) {
    if (result.length >= minLength) break
    if (!bit) continue
    if (result.includes(bit)) continue
    result = result ? `${result} — ${bit}` : bit
  }

  while (result.length < minLength) {
    const topicFiller = isZh
      ? "技术向 Minecraft 开放教科书章节，讲解红石工程、游戏机制、区块系统、实体运动与引擎内部原理，适合自学、查阅与社区协作。"
      : "technical Minecraft textbook chapter covering redstone engineering, game mechanics, chunk systems, and engine internals."
    const filler = result.includes(siteName)
      ? topicFiller
      : isZh
        ? `${siteName}：${topicFiller}`
        : `${siteName} ${topicFiller}`
    const next = result ? `${result} — ${filler}` : filler
    if (next === result) break
    result = next
  }

  result = result.replaceAll(/\s+/g, " ").trim()
  if (result.length <= maxLength) return result

  const soft = truncateAtWord(result, maxLength)
  if (soft.length >= minLength) return soft
  return result.slice(0, maxLength - 1) + "…"
}
