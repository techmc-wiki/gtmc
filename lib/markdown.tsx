import { remark } from "remark"
import stripMarkdown from "strip-markdown"

export * from "@/lib/markdown/components"
export * from "@/lib/markdown/processor"

export function calculateReadingMetrics(content: string) {
  const cjkCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const westernWordCount = (content.match(/[a-zA-Z0-9]+/g) || []).length
  const wordCount = cjkCount + westernWordCount
  const readingTime = Math.max(1, Math.ceil(wordCount / 300))
  return { wordCount, readingTime }
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
