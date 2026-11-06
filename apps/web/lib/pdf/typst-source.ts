import { artifactFilename } from "@gtmc/ssg/articles/content"

import {
  chapterArticles,
  type ChapterContent,
  type ChapterGroup,
  type NumberedArticle,
  type PdfLocale,
} from "./document/types"

const ESCAPES: Partial<Record<string, string>> = {
  "\\": "\\\\",
  '"': '\\"',
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
}

/** Metadata reaches Typst only as string literals, so quotes and markup in titles stay inert. */
export function typstString(value: string): string {
  let literal = ""
  for (const char of value) {
    const escaped = ESCAPES[char]
    if (escaped !== undefined) {
      literal += escaped
      continue
    }
    const code = char.codePointAt(0) ?? 0
    literal += code < 0x20 || code === 0x7f ? `\\u{${code.toString(16)}}` : char
  }
  return `"${literal}"`
}

/** Same flat naming as the article artifacts, so one slug maps to one source file. */
export function articleFileName(slug: string): string {
  return `${artifactFilename(slug)}.typ`
}

/** Wraps one emitted article body in the template's `#article` call. */
export function renderArticleSource(
  entry: NumberedArticle,
  body: string,
  preface: boolean
): string {
  const { article, number } = entry
  return [
    '#import "/template/gtmc.typ": *',
    `#article(slug: ${typstString(article.slug)}, number: ${number === null ? "none" : typstString(number)}, title: ${typstString(article.title)}, advanced: ${article.isAdvanced}, preface: ${preface})[`,
    body.trim(),
    "]",
    "",
  ].join("\n")
}

export interface BookSource {
  locale: PdfLocale
  title: string
  subtitle: string
  tagline: string
  date: string
  revision: string | null
  sourceUrl: string
  articleCount: number
  preface: NumberedArticle[]
  chapters: ChapterGroup[]
}

/** Emits book.typ in the order tools/pdf/README.md defines; the template owns all layout. */
export function renderBookSource(book: BookSource): string {
  const metadata = [
    `locale: ${typstString(book.locale)}`,
    `title: ${typstString(book.title)}`,
    `subtitle: ${typstString(book.subtitle)}`,
    `tagline: ${typstString(book.tagline)}`,
    `date: ${typstString(book.date)}`,
    `revision: ${book.revision === null ? "none" : typstString(book.revision)}`,
    `source-url: ${typstString(book.sourceUrl)}`,
    `article-count: ${book.articleCount}`,
  ]
  const lines = [
    '#import "/template/gtmc.typ": *',
    `#show: book.with(${metadata.join(", ")})`,
    "#cover()",
    "#show: front-matter",
    "#toc()",
    ...book.preface.map((entry) => includeArticle(entry.article.slug)),
    "#show: main-matter",
  ]

  for (const chapter of book.chapters) {
    lines.push(
      `#chapter(number: ${typstString(chapter.number)}, title: ${typstString(chapter.title)}, appendix: ${chapter.isAppendix}, articles: (`,
      ...chapterArticles(chapter).map(
        (entry) => `  ${articleReference(entry)},`
      ),
      "))",
      ...contentLines(chapter.content)
    )
  }

  lines.push("#colophon()")
  return `${lines.join("\n")}\n`
}

function includeArticle(slug: string): string {
  return `#include ${typstString(`articles/${articleFileName(slug)}`)}`
}

function contentLines(content: ChapterContent[]): string[] {
  return content.flatMap((item) =>
    item.kind === "folder"
      ? [`#folder(${typstString(item.title)})`, ...contentLines(item.content)]
      : [includeArticle(item.entry.article.slug)]
  )
}

function articleReference(entry: NumberedArticle): string {
  const number =
    entry.number === null ? "" : `number: ${typstString(entry.number)}, `
  return `(${number}title: ${typstString(entry.article.title)}, slug: ${typstString(entry.article.slug)})`
}
