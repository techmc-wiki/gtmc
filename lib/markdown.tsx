import { remark } from "remark"
import stripMarkdown from "strip-markdown"

export * from "@/lib/markdown/components"
export * from "@/lib/markdown/processor"

/**
 * Calculate reading metrics with weighted processing for different content types.
 * - English: 225 words/minute (average adult reading speed)
 * - Chinese: 350 characters/minute (average Chinese reading speed)
 * - Code: 100 lines/minute (slower, careful reading)
 */
export function calculateReadingMetrics(content: string) {
  // Extract code blocks (```...``` or indented code)
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g
  const codeBlocks = content.match(codeBlockRegex) || []
  const codeContent = codeBlocks.join(" ")
  const codeCount = codeContent.length

  // Get non-code content for text analysis
  const nonCodeContent = content.replace(codeBlockRegex, " ")

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
  maxLength: number = 155
): string {
  const plainText = remark()
    .use(stripMarkdown)
    .processSync(markdown)
    .toString()
    .replace(/\s+/g, " ")
    .trim()
  if (plainText.length <= maxLength) return plainText

  const truncated = plainText.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(" ")
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + "…" : truncated + "…"
}
