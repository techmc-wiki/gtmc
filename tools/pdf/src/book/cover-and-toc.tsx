import { TargetPageNumber } from "takumi-pdf/primitives"

import { Divider } from "@/components/pdf/divider/divider"
import { Stack } from "@/components/pdf/stack/stack"
import { Text } from "@/components/pdf/text/text"
import { View } from "@/lib/pdf-primitives"

import { bookLabels } from "./labels"
import type { BookArticle, BookPlan, PdfLocale } from "./manifest"
import { bookStyles } from "./styles"

export interface CoverProps {
  locale: PdfLocale
  title: string
  /** Edition label, set in the apparatus face above the title. */
  edition: string
  subtitle?: string
  tagline?: string
  revision?: string
  sourceUrl?: string
}

export function Cover({
  locale,
  title,
  edition,
  subtitle,
  tagline,
  revision,
  sourceUrl,
}: CoverProps) {
  const labels = bookLabels(locale)
  return (
    <View style={bookStyles.coverRoot}>
      <View style={bookStyles.coverBand} />
      <View style={bookStyles.coverBody}>
        <Text style={bookStyles.coverTitle}>{title}</Text>
        {subtitle ? (
          <Text style={bookStyles.coverSubtitle}>{subtitle}</Text>
        ) : null}
        <View style={bookStyles.coverRule} />
        {tagline ? (
          <Text style={bookStyles.coverTagline}>{tagline}</Text>
        ) : null}
      </View>
      {/* The edition is a fact about this copy, not a title, so it sits with
          the other facts at the foot instead of above the name. */}
      <View style={bookStyles.coverFoot}>
        <View>
          <Text style={bookStyles.coverEdition}>{edition}</Text>
          {revision ? (
            <Text style={bookStyles.apparatusQuiet}>
              {`${labels.revision} ${revision.slice(0, 7)}`}
            </Text>
          ) : null}
        </View>
        <Text style={bookStyles.apparatusQuiet}>{sourceUrl ?? ""}</Text>
      </View>
    </View>
  )
}

export interface TocProps {
  plan: BookPlan
  locale: PdfLocale
}

interface TocGroup {
  key: string
  /** Empty for the front matter, which is not a numbered chapter. */
  number: string
  isAppendix: boolean
  title: string
  articles: BookArticle[]
}

/**
 * The table of contents. Each row is an internal link to the article's anchor,
 * with a stretched dotted rule as the leader and a target page number in the
 * reserved right column. Folio width is reserved so a digit never widens the
 * row and moves a page break.
 */
export function Toc({ plan, locale }: TocProps) {
  const labels = bookLabels(locale)
  const groups: TocGroup[] = [
    ...(plan.preface.length > 0
      ? [
          {
            key: "preface",
            number: "",
            isAppendix: false,
            title: labels.preface,
            articles: plan.preface,
          },
        ]
      : []),
    ...plan.chapters.map((chapter) => ({
      key: chapter.slug,
      number: chapter.number,
      isAppendix: chapter.isAppendix,
      title: chapter.title,
      articles: chapter.articles,
    })),
  ]

  return (
    <View>
      <Text style={bookStyles.tocTitle}>{labels.contents}</Text>
      {groups.map((group) => (
        <View key={group.key}>
          <View style={bookStyles.tocChapter}>
            <Text style={bookStyles.tocChapterLabel}>
              {group.number
                ? group.isAppendix
                  ? labels.appendixLabel(group.number)
                  : labels.chapterLabel(group.number)
                : labels.frontMatter}
            </Text>
            <Text style={bookStyles.tocChapterTitle}>{group.title}</Text>
          </View>
          <Stack gap="none">
            {group.articles.map((article) => (
              <View key={article.slug} style={bookStyles.tocRow}>
                <Text style={bookStyles.tocNum}>{article.number}</Text>
                <a
                  href={`#${article.slug}`}
                  style={{ display: "flex", flexGrow: 1 }}>
                  <Text style={bookStyles.tocText}>{article.title}</Text>
                </a>
                <View style={bookStyles.tocLeader} />
                <a
                  href={`#${article.slug}`}
                  style={bookStyles.tocFolio as React.CSSProperties}>
                  <TargetPageNumber />
                </a>
              </View>
            ))}
          </Stack>
        </View>
      ))}
      <Divider style={{ marginTop: 16 }} />
    </View>
  )
}
