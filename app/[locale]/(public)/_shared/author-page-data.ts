import { getTranslations } from "next-intl/server"
import {
  getArticlesByAuthor,
  getMaintainerHandles,
  resolveAuthorPerson,
} from "@/lib/articles/person-resolver"
import { getRepositoryContributorStats } from "@/lib/git/repository-contributor-stats"
import type { ArticleLocale } from "@/lib/articles/manifest"
import type { AuthorGridItem } from "@/components/mdx/author-grid"

export async function buildMaintainers(
  articleLocale: ArticleLocale
): Promise<AuthorGridItem[]> {
  const t = await getTranslations({
    locale: articleLocale,
    namespace: "Authors",
  })
  return getMaintainerHandles().map((handle) => {
    const person = resolveAuthorPerson(handle)
    const repositoryStats = getRepositoryContributorStats([
      handle,
      person.key,
      person.name,
    ])
    return {
      handle,
      person,
      footer: t("maintainerStats", { ...repositoryStats }),
    }
  })
}
const PREVIEW_AUTHOR_COUNT = 8

export function buildPreviewAuthors(
  articleLocale: ArticleLocale,
  allAuthors: string[],
  manifest: Parameters<typeof getArticlesByAuthor>[2]
): AuthorGridItem[] {
  return allAuthors
    .map((handle) => ({
      handle,
      person: resolveAuthorPerson(handle),
      articleCount: getArticlesByAuthor(handle, articleLocale, manifest).length,
    }))
    .toSorted((a, b) => b.articleCount - a.articleCount)
    .slice(0, PREVIEW_AUTHOR_COUNT)
    .map(({ handle, person }) => ({ handle, person }))
}

export async function buildProfiles(
  articleLocale: ArticleLocale,
  allAuthors: string[],
  manifest: Parameters<typeof getArticlesByAuthor>[2]
): Promise<AuthorGridItem[]> {
  const t = await getTranslations({
    locale: articleLocale,
    namespace: "Authors",
  })
  return allAuthors
    .map((handle) => ({
      handle,
      person: resolveAuthorPerson(handle),
      articleCount: getArticlesByAuthor(handle, articleLocale, manifest).length,
    }))
    .toSorted((a, b) => b.articleCount - a.articleCount)
    .map(({ handle, person, articleCount }) => ({
      handle,
      person,
      footer: t("articleCount", { count: articleCount }),
    }))
}

export function buildAboutStats(
  stats: { articleCount: number; lastRevision: string | null },
  allAuthors: string[],
  locale: string
) {
  return {
    articleCount: String(stats.articleCount),
    contributors: String(allAuthors.length),
    lastRevision: stats.lastRevision
      ? new Date(stats.lastRevision).toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—",
  }
}

export function buildAuthorsStats(allAuthors: string[], articleCount: number) {
  return { authors: String(allAuthors.length), articles: String(articleCount) }
}
