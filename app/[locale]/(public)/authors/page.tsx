import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { SectionTitle } from "@/components/ui/section-title"
import { TechCard } from "@/components/ui/tech-card"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { ResolvedPerson } from "@/lib/markdown/people"
import { toAbsoluteUrl, getSiteUrl } from "@/lib/site-url"
import { getManifestStats, loadArticleManifest } from "@/lib/articles/manifest"
import {
  getUniqueAuthors,
  getMaintainerHandles,
  resolveAuthorPerson,
  getArticlesByAuthor,
} from "@/lib/articles/person-resolver"
import { getRepositoryContributorStats } from "@/lib/git/repository-contributor-stats"
import { buildWebPageJsonLd, serializeJsonLd } from "@/lib/seo/json-ld"
import type { ArticleLocale } from "@/lib/articles/manifest"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Authors" })
  const canonical = toAbsoluteUrl(`/${locale}/authors`)

  return {
    title: t("pageTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical,
      languages: {
        en: toAbsoluteUrl("/en/authors"),
        zh: toAbsoluteUrl("/zh/authors"),
        "x-default": toAbsoluteUrl("/zh/authors"),
      },
    },
    openGraph: {
      title: t("pageTitle"),
      description: t("metaDescription"),
      type: "website",
      url: canonical,
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/opengraph-image"],
    },
  }
}

export default async function AuthorsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const articleLocale = locale as ArticleLocale
  const t = await getTranslations({ locale, namespace: "Authors" })
  const siteUrl = getSiteUrl()

  const stats = getManifestStats(articleLocale)
  const manifest = loadArticleManifest()
  const allAuthors = getUniqueAuthors(manifest)
  const maintainers = getMaintainerHandles().map((handle) => {
    const person = resolveAuthorPerson(handle)
    return {
      handle,
      person,
      repositoryStats: getRepositoryContributorStats([
        handle,
        person.key,
        person.name,
      ]),
    }
  })

  const authorsWithCount = allAuthors.map((handle) => ({
    handle,
    person: resolveAuthorPerson(handle),
    articleCount: getArticlesByAuthor(handle, articleLocale, manifest).length,
  }))

  authorsWithCount.sort((a, b) => b.articleCount - a.articleCount)

  const jsonLd = serializeJsonLd(
    buildWebPageJsonLd(
      siteUrl,
      `/${locale}/authors`,
      t("pageTitle"),
      t("metaDescription")
    )
  )

  return (
    <div className="page-container-pb">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />

      <PageHeader
        title={t("pageTitle")}
        subtitle={t("pageDescription")}
        topMargin
      />

      <section className="mt-10">
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label={t("statsAuthors")}
            value={String(allAuthors.length)}
          />
          <StatCard
            label={t("statsArticles")}
            value={String(stats.articleCount)}
          />
        </div>
      </section>

      {maintainers.length > 0 ? (
        <section className="mt-10">
          <SectionTitle>{t("maintainersTitle")}</SectionTitle>
          <p className="text-tech-main mb-6 max-w-3xl text-sm/relaxed">
            {t("maintainersDescription")}
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {maintainers.map(({ handle, person, repositoryStats }) => (
              <ProfileCard
                key={handle}
                handle={handle}
                person={person}
                fallbackBio={t("fallbackBio")}
                footer={t("maintainerStats", { ...repositoryStats })}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <SectionTitle>{t("sectionTitle")}</SectionTitle>
        <p className="text-tech-main/60 mb-6 font-mono text-xs tracking-widest uppercase">
          {t("sortLabel")}
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {authorsWithCount.map(({ handle, person, articleCount }) => (
            <ProfileCard
              key={handle}
              handle={handle}
              person={person}
              fallbackBio={t("fallbackBio")}
              footer={t("articleCount", { count: articleCount })}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function ProfileCard({
  handle,
  person,
  fallbackBio,
  footer,
}: {
  handle: string
  person: ResolvedPerson
  fallbackBio: string
  footer: string
}) {
  return (
    <Link
      href={`/authors/${encodeURIComponent(handle)}`}
      className="group/link focus-visible:outline-tech-main block focus-visible:outline-2 focus-visible:outline-offset-2">
      <TechCard padding="compact" hover="border">
        <div className="flex items-start gap-3">
          <div className="size-12 shrink-0">
            <UserAvatar
              src={person.profile}
              alt={person.name}
              fallback={person.name}
              sizes="48px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-tech-main-dark truncate text-sm font-medium">
              {person.name}
            </p>
            <p className="text-tech-main/60 truncate font-mono text-xs">
              @{handle}
            </p>
            <p className="text-tech-main mt-1 line-clamp-2 text-xs/relaxed">
              {person.description ?? fallbackBio}
            </p>
            <div className="text-tech-main/50 mt-2 flex items-center justify-between gap-3 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
              <span className="truncate">{footer}</span>
              <span
                aria-hidden="true"
                className="text-tech-main/40 group-hover/link:text-tech-signal shrink-0 transition-colors">
                →
              </span>
            </div>
          </div>
        </div>
      </TechCard>
    </Link>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <TechCard padding="compact">
      <p className="text-tech-main/60 mb-1 font-mono text-[0.625rem] tracking-[0.25em] uppercase">
        {label}
      </p>
      <p className="text-tech-main-dark text-lg font-semibold">{value}</p>
    </TechCard>
  )
}
