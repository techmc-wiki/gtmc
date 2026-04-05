import { remark } from "remark"
import stripMarkdown from "strip-markdown"
import { stripAnsiColorMarkup } from "@/lib/markdown/ansi-colors"

export * from "@/lib/markdown/components"
export * from "@/lib/markdown/markdown-renderer"
export * from "@/lib/markdown/processor"

/**
 * Calculate reading metrics with weighted processing for different content types.
 * - English: 225 words/minute (average adult reading speed)
 * - Chinese: 350 characters/minute (average Chinese reading speed)
 * - Code: 100 lines/minute (slower, careful reading)
 */
export function calculateReadingMetrics(content: string) {
  const normalizedContent = stripAnsiColorMarkup(content)

  // Extract code blocks (```...``` or indented code)
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g
  const codeBlocks = normalizedContent.match(codeBlockRegex) || []
  const codeContent = codeBlocks.join(" ")
  const codeCount = codeContent.length

  // Get non-code content for text analysis
  const nonCodeContent = normalizedContent.replace(codeBlockRegex, " ")

  // Count Chinese characters (CJK)
  const cjkCount = (nonCodeContent.match(/[\u4e00-\u9fa5]/g) || []).length

  // Count Western words (English alphanumeric sequences)
  const westernWordCount = (nonCodeContent.match(/[a-zA-Z0-9]+/g) || []).length

  // Calculate weighted reading time
  // English words at 225 WPM
  const englishMinutes = westernWordCount / 225
  // Chinese characters at 350 chars/min
  const chineseMinutes = cjkCount / 350
  // Code at 100 lines/min (estimate ~50 chars per line)
  const codeMinutes = codeCount / (100 * 50)

  const totalMinutes = englishMinutes + chineseMinutes + codeMinutes
  const readingTime = Math.max(1, Math.ceil(totalMinutes))

  // Total word count for display (weighted sum for consistency)
  const wordCount = westernWordCount + cjkCount + Math.floor(codeCount / 50)

  return {
    wordCount,
    readingTime,
    chineseCount: cjkCount,
    englishCount: westernWordCount,
    codeCount: Math.floor(codeCount / 50),
  }
}

export function generateDescription(
  markdown: string,
  frontmatterDescription?: string,
  maxLength: number = 155
): string {
  const normalizedMarkdown = stripAnsiColorMarkup(markdown)

  // If frontmatter description is provided and non-empty, use it
  if (frontmatterDescription?.trim()) {
    const trimmed = frontmatterDescription.trim()
    if (trimmed.length <= maxLength) return trimmed

    const truncated = trimmed.slice(0, maxLength)
    const lastSpace = truncated.lastIndexOf(" ")
    return lastSpace > 0 ? truncated.slice(0, lastSpace) + "…" : truncated + "…"
  }

  // Extract first real paragraph from markdown
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

  // Walk through lines to find first real paragraph
  let inCodeFence = false
  let paragraphLines: string[] = []

  while (lineIndex < lines.length) {
    const line = lines[lineIndex]
    const trimmed = line.trim()

    // Toggle code fence state
    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence
      lineIndex++
      continue
    }

    // Skip lines while in code fence
    if (inCodeFence) {
      lineIndex++
      continue
    }

    // Skip blank lines
    if (!trimmed) {
      lineIndex++
      continue
    }

    // Skip headings, images, blockquotes, HTML, horizontal rules, list items
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("![") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("<") ||
      trimmed === "---" ||
      trimmed === "***" ||
      trimmed === "___" ||
      /^[-*+]\s/.test(trimmed) ||
      /^\d+\.\s/.test(trimmed)
    ) {
      lineIndex++
      continue
    }

    // Found first real line - collect contiguous non-skipped lines
    while (lineIndex < lines.length) {
      const currentLine = lines[lineIndex]
      const currentTrimmed = currentLine.trim()

      // Stop at blank line or skip-worthy line
      if (
        !currentTrimmed ||
        currentTrimmed.startsWith("#") ||
        currentTrimmed.startsWith("![") ||
        currentTrimmed.startsWith(">") ||
        currentTrimmed.startsWith("<") ||
        currentTrimmed === "---" ||
        currentTrimmed === "***" ||
        currentTrimmed === "___" ||
        /^[-*+]\s/.test(currentTrimmed) ||
        /^\d+\.\s/.test(currentTrimmed) ||
        currentTrimmed.startsWith("```")
      ) {
        break
      }

      paragraphLines.push(currentLine)
      lineIndex++
    }

    break
  }

  // If no paragraph found, return empty string
  if (paragraphLines.length === 0) return ""

  // Process extracted paragraph through remark + strip-markdown
  const paragraphText = paragraphLines.join("\n")
  const plainText = remark()
    .use(stripMarkdown)
    .processSync(paragraphText)
    .toString()
    .replace(/\s+/g, " ")
    .trim()

  if (plainText.length <= maxLength) return plainText

  const truncated = plainText.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(" ")
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + "…" : truncated + "…"
}
