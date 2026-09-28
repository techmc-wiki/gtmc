import { Stack } from "@/components/pdf/stack/stack"
import { Text } from "@/components/pdf/text/text"
import { View } from "@/lib/pdf-primitives"

import type { BookArticle, BookChapter } from "./manifest"
import { bookStyles } from "./styles"
import { GTMC_COLORS } from "../theme"

/**
 * A chapter opener: the numeral, the title, and what the chapter contains.
 * The list earns its space by telling the reader the scope of the chapter
 * before they commit to it.
 */
export function ChapterOpener({ chapter }: { chapter: BookChapter }) {
  return (
    <View style={bookStyles.chapterOpener}>
      <Text style={bookStyles.chapterKicker}>
        {chapter.isAppendix ? "Appendix" : "Chapter"}
      </Text>
      <Text style={bookStyles.chapterNumeral}>{chapter.number}</Text>
      {/* A real `h1`, not a styled span: the PDF outline is built from heading
          tags, so a chapter that is not one is a chapter with no bookmark. */}
      <h1 style={bookStyles.chapterTitle as React.CSSProperties}>
        {chapter.title}
      </h1>
      <View style={bookStyles.chapterContents}>
        <Text style={bookStyles.chapterContentsLabel}>In this chapter</Text>
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

/** The article's own head: running number, then title. */
export function ArticleHead({ article }: { article: BookArticle }) {
  return (
    <View style={bookStyles.articleHeader}>
      <Text style={bookStyles.articleNumber}>Article {article.number}</Text>
      {/* The `h2` the article's own sections nest under; see `demoteHeadings`. */}
      <h2 style={bookStyles.articleTitle as React.CSSProperties}>
        {article.title}
      </h2>
    </View>
  )
}

export interface ColophonProps {
  revision?: string
  generatedDate: string
  sourceUrl?: string
}

/** The closing page: where the text came from and how to follow it. */
export function Colophon({
  revision,
  generatedDate,
  sourceUrl,
}: ColophonProps) {
  return (
    <View style={bookStyles.colophon}>
      <h1 style={bookStyles.articleTitle as React.CSSProperties}>Colophon</h1>
      <View style={bookStyles.coverRule} />
      <Text style={bookStyles.tocText}>
        This edition was generated from the Graduate Texts in Minecraft article
        repository
        {revision ? ` at revision ${revision.slice(0, 7)}` : ""}.
      </Text>
      <Text style={bookStyles.apparatusQuiet}>Generated {generatedDate}</Text>
      {sourceUrl ? (
        <Text
          style={{ ...bookStyles.apparatusQuiet, color: GTMC_COLORS.signal }}>
          {sourceUrl}
        </Text>
      ) : null}
    </View>
  )
}
