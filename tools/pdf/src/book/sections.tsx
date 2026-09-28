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
      <Text style={bookStyles.chapterTitle}>{chapter.title}</Text>
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
      <Text style={bookStyles.articleTitle}>{article.title}</Text>
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
      <Text style={bookStyles.articleTitle}>Colophon</Text>
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
