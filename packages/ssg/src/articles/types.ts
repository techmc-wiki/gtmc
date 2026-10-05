export type ArticleLocale = "en" | "zh"
export type TranslationLocale = Exclude<ArticleLocale, "zh">
export type TranslationFreshness = "fresh" | "stale" | "unknown"

export type TranslationStatusDetail = {
  readonly translatedFromRevision: string
  readonly latestOriginalRevision: string
  readonly commitLag: number
  readonly dayLag: number
  readonly latestOriginalCommitUrl: string
}

export interface ArticleEntry {
  filePath: string
  slug: string
  titleByLocale: Partial<Record<ArticleLocale, string>>
  availableLocales: ArticleLocale[]
  localizedFilePaths: Partial<Record<ArticleLocale, string>>
  chapterTitleByLocale: Partial<Record<ArticleLocale, string>>
  introTitleByLocale: Partial<Record<ArticleLocale, string>>
  descriptionByLocale: Partial<Record<ArticleLocale, string>>
  hasIntro: boolean
  index: number
  isFolder: boolean
  isAppendix: boolean
  isPreface: boolean
  parentSlug?: string
  /** Attribution is derived from Git history, never from frontmatter. */
  author?: string
  coAuthors?: string[]
  created?: string
  lastmodByLocale: Partial<Record<ArticleLocale, string>>
  translatedFromRevisionByLocale: Partial<Record<TranslationLocale, string>>
  translationFreshnessByLocale: Partial<
    Record<TranslationLocale, TranslationFreshness>
  >
  translationStatusByLocale?: Partial<
    Record<TranslationLocale, TranslationStatusDetail>
  >
  bannerByLocale?: Partial<Record<ArticleLocale, { src: string; alt?: string }>>
  isAdvanced?: boolean
  isRevising?: boolean
}
