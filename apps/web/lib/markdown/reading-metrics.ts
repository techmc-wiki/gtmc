import { stripAnsiColorMarkup } from "@/lib/markdown/ansi-colors"

/** Reading time weights English words, Chinese characters, and code lines at 225/min, 350/min, and 100 lines/min respectively. */
export function calculateReadingMetrics(content: string) {
  const normalizedContent = stripAnsiColorMarkup(content)

  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g
  const codeBlocks = normalizedContent.match(codeBlockRegex) || []
  const codeContent = codeBlocks.join(" ")
  const codeCount = codeContent.length

  const nonCodeContent = normalizedContent.replace(codeBlockRegex, " ")

  const cjkCount = (nonCodeContent.match(/[\u4e00-\u9fa5]/g) || []).length

  const westernWordCount = (nonCodeContent.match(/[a-zA-Z0-9]+/g) || []).length

  const englishMinutes = westernWordCount / 225
  const chineseMinutes = cjkCount / 350
  const codeMinutes = codeCount / (100 * 50)

  const totalMinutes = englishMinutes + chineseMinutes + codeMinutes
  const readingTime = Math.max(1, Math.ceil(totalMinutes))

  const wordCount = westernWordCount + cjkCount + Math.floor(codeCount / 50)

  return {
    wordCount,
    readingTime,
    chineseCount: cjkCount,
    englishCount: westernWordCount,
    codeCount: Math.floor(codeCount / 50),
  }
}
