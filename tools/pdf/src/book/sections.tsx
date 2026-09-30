import { Stack } from "@/components/pdf/stack/stack"
import { Text } from "@/components/pdf/text/text"
import { View } from "@/lib/pdf-primitives"

import { bookLabels } from "./labels"
import type { BookArticle, BookChapter, PdfLocale } from "./manifest"
import { bookStyles } from "./styles"
import { FONT_STACKS } from "../theme"

export interface ChapterOpenerProps {
  chapter: BookChapter
  locale: PdfLocale
}

/**
 * A chapter opener: the numeral, the title, and what the chapter contains.
 * The list earns its space by telling the reader the scope of the chapter
 * before they commit to it.
 */
export function ChapterOpener({ chapter, locale }: ChapterOpenerProps) {
  const labels = bookLabels(locale)
  return (
    <View style={bookStyles.chapterOpener}>
      <Text style={bookStyles.chapterKicker}>
        {chapter.isAppendix ? labels.appendix : labels.chapter}
      </Text>
      <Text style={bookStyles.chapterNumeral}>{chapter.number}</Text>
      {/* A real `h1`, not a styled span: the PDF outline is built from heading
          tags, so a chapter that is not one is a chapter with no bookmark. */}
      <h1 style={bookStyles.chapterTitle as React.CSSProperties}>
        {chapter.title}
      </h1>
      <View style={bookStyles.chapterContents}>
        <Text style={bookStyles.chapterContentsLabel}>
          {labels.inThisChapter}
        </Text>
        <Stack gap="none">
          {chapter.articles.map((article) => (
            <View key={article.slug} style={bookStyles.chapterListRow}>
              <Text style={bookStyles.tocNum}>{article.number}</Text>
              <Text style={bookStyles.tocText}>{article.title}</Text>
            </View>
          ))}
        </Stack>
      </View>
    </View>
  )
}

export interface ArticleHeadProps {
  article: BookArticle
}

/**
 * The article's own head. It carries the title and nothing else: the number
 * is already on the chapter opener's list and against the contents entry, so
 * repeating it above the title told the reader the same thing three times.
 */
export function ArticleHead({ article }: ArticleHeadProps) {
  return (
    <View style={bookStyles.articleHeader}>
      {/* The `h2` the article's own sections nest under; see `demoteHeadings`. */}
      <h2 style={bookStyles.articleTitle as React.CSSProperties}>
        {article.title}
      </h2>
    </View>
  )
}

export interface ColophonProps {
  locale: PdfLocale
  revision?: string
  generatedDate: string
  sourceUrl?: string
}

/** The closing page: where the text came from and how to follow it. */
export function Colophon({
  locale,
  revision,
  generatedDate,
  sourceUrl,
}: ColophonProps) {
  const labels = bookLabels(locale)
  return (
    <View style={bookStyles.colophon}>
      <h1 style={bookStyles.articleTitle as React.CSSProperties}>
        {labels.colophonTitle}
      </h1>
      <View style={bookStyles.coverRule} />
      <Text style={bookStyles.tocText}>{labels.colophonSource}</Text>
      {revision ? (
        <Text style={bookStyles.tocText}>
          {labels.colophonRevision} {revision.slice(0, 7)}
        </Text>
      ) : null}
      <Text style={bookStyles.apparatusQuiet}>
        {labels.colophonGenerated} {generatedDate}
      </Text>
      {sourceUrl ? (
        <Text style={bookStyles.tocText}>
          {labels.colophonOnline}{" "}
          <span style={{ fontFamily: FONT_STACKS.mono }}>{sourceUrl}</span>
        </Text>
      ) : null}
    </View>
  )
}
