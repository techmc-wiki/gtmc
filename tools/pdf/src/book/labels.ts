import type { PdfLocale } from "./manifest"

/**
 * The furniture the book draws around its articles: the cover, the contents,
 * the chapter openers, the colophon. Article and chapter titles come from the
 * articles themselves; these are the strings the renderer owns, so the Chinese
 * edition is given the Chinese ones.
 */
export interface BookLabels {
  contents: string
  frontMatter: string
  preface: string
  /** The opener's kicker, set above the chapter numeral. */
  chapter: string
  appendix: string
  /** The running label the contents gives a chapter, with its number. */
  chapterLabel: (number: string) => string
  appendixLabel: (number: string) => string
  inThisChapter: string
  /** The running label the article head gives a numbered article. */
  article: string
  revision: string
  colophonTitle: string
  colophonSource: string
  colophonGenerated: string
  colophonRevision: string
  colophonOnline: string
}

const LABELS: Record<PdfLocale, BookLabels> = {
  en: {
    contents: "Contents",
    frontMatter: "Front matter",
    preface: "Preface",
    chapter: "Chapter",
    appendix: "Appendix",
    chapterLabel: (number) => `Chapter ${number}`,
    appendixLabel: (number) => `Appendix ${number}`,
    inThisChapter: "In this chapter",
    article: "Article",
    revision: "Revision",
    colophonTitle: "Colophon",
    colophonSource:
      "This edition was generated from the Graduate Texts in Minecraft article repository.",
    colophonGenerated: "Generated on",
    colophonRevision: "Articles revision:",
    colophonOnline: "Read online at",
  },
  zh: {
    contents: "目录",
    frontMatter: "前置部分",
    preface: "总序",
    chapter: "章",
    appendix: "附录",
    chapterLabel: (number) => `第 ${number} 章`,
    appendixLabel: (number) => `附录 ${number}`,
    inThisChapter: "本章内容",
    article: "文章",
    revision: "版本",
    colophonTitle: "版本说明",
    colophonSource: "本版本生成自 Graduate Texts in Minecraft 文章仓库。",
    colophonGenerated: "生成于",
    colophonRevision: "文章版本：",
    colophonOnline: "在线阅读：",
  },
}

export function bookLabels(locale: PdfLocale): BookLabels {
  return LABELS[locale]
}
