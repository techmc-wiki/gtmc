import type { PdfLocale } from "./types"

export interface BookLabels {
  tocTitle: string
  chapter: string
  appendix: string
  articlesInChapter: string
  animatedFigure: string
  viewOriginal: string
  colophonTitle: string
  colophonGenerated: string
  colophonLicense: string
  colophonSource: string
  colophonCommunity: string
  colophonRevision: string
}

const LABELS: Record<PdfLocale, BookLabels> = {
  en: {
    tocTitle: "Contents",
    chapter: "Chapter",
    appendix: "Appendix",
    articlesInChapter: "In this chapter",
    animatedFigure: "This figure is animated.",
    viewOriginal: "View original",
    colophonTitle: "Colophon",
    colophonGenerated: "This edition was generated on",
    colophonLicense:
      "Articles are licensed under CC BY-NC-SA 4.0. Website code is licensed under Apache-2.0.",
    colophonSource: "Read online, with animated figures and updates, at",
    colophonCommunity:
      "Written and reviewed by the technical Minecraft community.",
    colophonRevision: "Articles revision:",
  },
  zh: {
    tocTitle: "目录",
    chapter: "第",
    appendix: "附录",
    articlesInChapter: "本章内容",
    animatedFigure: "该图为动图。",
    viewOriginal: "查看原图",
    colophonTitle: "版本说明",
    colophonGenerated: "本版本生成于",
    colophonLicense:
      "文章采用 CC BY-NC-SA 4.0 许可协议。网站代码采用 Apache-2.0 许可协议。",
    colophonSource: "在线阅读（含动图与最新更新）：",
    colophonCommunity: "由技术性 Minecraft 社区共同编写与审阅。",
    colophonRevision: "文章版本：",
  },
}

export function getLabels(locale: PdfLocale): BookLabels {
  return LABELS[locale]
}

/**
 * Localized chapter designation, e.g. "Chapter 3" / "第 3 章" or
 * "Appendix A" / "附录 A".
 */
export function formatChapterLabel(
  locale: PdfLocale,
  number: string,
  isAppendix: boolean
): string {
  if (isAppendix) {
    return locale === "zh" ? `附录 ${number}` : `Appendix ${number}`
  }
  return locale === "zh" ? `第 ${number} 章` : `Chapter ${number}`
}
