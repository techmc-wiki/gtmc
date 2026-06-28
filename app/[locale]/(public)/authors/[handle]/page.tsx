import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { SectionTitle } from "@/components/ui/section-title"
import { TechCard } from "@/components/ui/tech-card"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
  GithubIcon,
  BilibiliIcon,
  TwitterIcon,
  GlobeIcon,
} from "@/components/ui/social-icons"
import { toAbsoluteUrl, getSiteUrl } from "@/lib/site-url"
import {
  getUniqueAuthors,
  resolveAuthorPerson,
  getArticlesByAuthor,
} from "@/lib/articles/person-resolver"
import { buildPersonJsonLd, serializeJsonLd } from "@/lib/seo/json-ld"
import {
  loadArticleManifest,
  type ArticleEntry,
  type ArticleLocale,
} from "@/lib/articles/manifest"
import type { AuthorArticleSummary } from "@/lib/articles/person-resolver"

interface AuthorDetailPageProps {
  params: Promise<{ locale: string; handle: string }>
}

function isValidHandle(
  handle: string,
  manifest?: Record<string, ArticleEntry>
): boolean {
  return getUniqueAuthors(manifest).includes(handle)
}

function decodeHandle(rawHandle: string): string {
  try {
    return decodeURIComponent(rawHandle)
  } catch {
    return rawHandle
  }
}

export async function generateStaticParams(): Promise<
  { locale: string; handle: string }[]
> {
  const handles = getUniqueAuthors()
  const locales = ["en", "zh"]
  return locales.flatMap((locale) =>
    handles.map((handle) => ({ locale, handle }))
  )
}

export async function generateMetadata({
  params,
}: AuthorDetailPageProps): Promise<Metadata> {
  const { locale, handle: rawHandle } = await params
  const handle = decodeHandle(rawHandle)
  const urlHandle = encodeURIComponent(handle)
  const manifest = loadArticleManifest()

  if (!isValidHandle(handle, manifest)) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: "AuthorDetail" })
  const person = resolveAuthorPerson(handle)
  const articleLocale = locale as ArticleLocale
  const articles = getArticlesByAuthor(handle, articleLocale, manifest)
  const canonical = toAbsoluteUrl(`/${locale}/authors/${urlHandle}`)

  const description =
    person.description ??
    (articles.length > 0
      ? t("metaDescription", {
          name: person.name,
          articleCount: articles.length,
        })
      : t("metaDescriptionFallback"))

  const title = `${person.name} | ${t("articlesLabel")}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: toAbsoluteUrl(`/en/authors/${urlHandle}`),
        zh: toAbsoluteUrl(`/zh/authors/${urlHandle}`),
        "x-default": toAbsoluteUrl(`/zh/authors/${urlHandle}`),
      },
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonical,
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  }
}

export default async function AuthorDetailPage({
  params,
}: AuthorDetailPageProps) {
  const { locale, handle: rawHandle } = await params
  const handle = decodeHandle(rawHandle)
  const urlHandle = encodeURIComponent(handle)
  const manifest = loadArticleManifest()

  if (!isValidHandle(handle, manifest)) {
    notFound()
  }

  const articleLocale = locale as ArticleLocale
  const t = await getTranslations({ locale, namespace: "AuthorDetail" })
  const siteUrl = getSiteUrl()

  const person = resolveAuthorPerson(handle)
  const articles = getArticlesByAuthor(handle, articleLocale, manifest)

  const coAuthoredCount = articles.filter(
    (a) =>
      a.author !== undefined &&
      a.author.toLowerCase() !== handle.toLowerCase() &&
      (a.coAuthors?.some((co) => co.toLowerCase() === handle.toLowerCase()) ??
        false)
  ).length

  const jsonLd = serializeJsonLd(
    buildPersonJsonLd(person, siteUrl, locale, urlHandle)
  )
  const contributorSince = getArticlesByAuthor(handle, "zh", manifest)
    .map((article) => manifest[article.slug]?.created)
    .filter((date): date is string => date !== undefined)
    .toSorted()[0]

  const githubUrl = person.social.github
    ? person.social.github.startsWith("http")
      ? person.social.github
      : `https://github.com/${person.social.github}`
    : null
  const bilibiliUrl = person.social.bilibili
    ? person.social.bilibili.startsWith("http")
      ? person.social.bilibili
      : `https://space.bilibili.com/${person.social.bilibili}`
    : null
  const twitterUrl = person.social.twitter
    ? person.social.twitter.startsWith("http")
      ? person.social.twitter
      : `https://twitter.com/${person.social.twitter}`
    : null
  const websiteUrl = person.social.website ?? null
  const customLinks = person.social.custom ?? []

  const hasSocialLinks =
    githubUrl !== null ||
    bilibiliUrl !== null ||
    twitterUrl !== null ||
    websiteUrl !== null ||
    customLinks.length > 0

  return (
    <div className="page-container-pb">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />

      <nav className="mt-8 mb-6">
        <p className="font-mono text-xs tracking-widest uppercase">
          <Link
            href="/authors"
            className="text-tech-main/70 hover:text-tech-main-dark transition-colors">
            {t("breadcrumbAuthors")}
          </Link>
          <span className="text-tech-main/40"> / </span>
          <span className="text-tech-main">{handle.toUpperCase()}</span>
        </p>
      </nav>

      <div className="bg-surface-overlay/60 border-tech-main/20 relative border p-6 backdrop-blur sm:p-8">
        <CornerBrackets
          className="pointer-events-none absolute inset-0"
          size="size-3"
          color="border-tech-main/40"
        />
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="size-24 shrink-0 md:size-32">
            <UserAvatar
              src={person.profile}
              alt={person.name}
              fallback={person.name}
              sizes="(max-width: 768px) 96px, 128px"
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="display-title text-tech-main-dark text-2xl tracking-tight md:text-3xl">
              {person.name}
            </h1>
            <p className="text-tech-main/60 mt-1 font-mono text-sm">
              @{handle}
            </p>

            <p className="text-tech-main mt-3 max-w-2xl text-sm/relaxed">
              {person.description ?? t("fallbackBio")}
            </p>

            {hasSocialLinks && (
              <div className="mt-4">
                <p className="text-tech-main/50 mb-2 font-mono text-[0.625rem] tracking-[0.25em] uppercase">
                  {t("socialLinksLabel")}
                </p>
                <div className="flex flex-wrap gap-3">
                  {githubUrl && (
                    <SocialLink href={githubUrl} label={t("githubProfile")}>
                      <GithubIcon className="size-3.5" />
                    </SocialLink>
                  )}
                  {bilibiliUrl && (
                    <SocialLink href={bilibiliUrl} label="bilibili">
                      <BilibiliIcon className="size-3.5" />
                    </SocialLink>
                  )}
                  {twitterUrl && (
                    <SocialLink href={twitterUrl} label="X / Twitter">
                      <TwitterIcon className="size-3.5" />
                    </SocialLink>
                  )}
                  {websiteUrl && (
                    <SocialLink href={websiteUrl} label="Website">
                      <GlobeIcon className="size-3.5" />
                    </SocialLink>
                  )}
                  {customLinks.map((link) => (
                    <SocialLink
                      key={link.url}
                      href={link.url}
                      label={link.label}>
                      <GlobeIcon className="size-3.5" />
                    </SocialLink>
                  ))}
                </div>
              </div>
            )}

            <div className="text-tech-main/50 mt-4 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.625rem] tracking-[0.25em] uppercase">
              <span>
                {t("articlesLabel")}: {articles.length}
              </span>
              <span>
                {t("coAuthoredLabel")}: {coAuthoredCount}
              </span>
              <span>
                {t("contributorSinceLabel")}:{" "}
                {contributorSince
                  ? new Date(contributorSince).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <SectionTitle>{t("articlesSectionTitle")}</SectionTitle>
        <p className="text-tech-main/60 mb-6 font-mono text-xs tracking-widest uppercase">
          {t("articlesSortLabel")}
        </p>

        {articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map((article, i) => (
              <ArticleRow
                key={article.slug}
                article={article}
                handle={handle}
                rowIndex={i + 1}
                coauthoredLabel={t("coauthoredBadge")}
              />
            ))}
          </div>
        ) : (
          <p className="text-tech-main/60 font-mono text-xs tracking-widest uppercase">
            {t("noArticles")}
          </p>
        )}
      </section>

      <nav className="mt-10">
        <Link
          href="/authors"
          className="text-tech-main/70 hover:text-tech-main-dark inline-flex items-center font-mono text-xs tracking-widest uppercase transition-colors">
          {t("backToList")}
        </Link>
      </nav>
    </div>
  )
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-tech-main hover:text-tech-main-dark inline-flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase transition-colors">
      {children}
      {label}
    </a>
  )
}

function ArticleRow({
  article,
  handle,
  rowIndex,
  coauthoredLabel,
}: {
  article: AuthorArticleSummary
  handle: string
  rowIndex: number
  coauthoredLabel: string
}) {
  const isCoAuthored =
    article.author !== undefined &&
    article.author.toLowerCase() !== handle.toLowerCase() &&
    (article.coAuthors?.some(
      (co) => co.toLowerCase() === handle.toLowerCase()
    ) ??
      false)

  const metaParts: string[] = []
  if (article.isPreface) metaParts.push("PREFACE")
  else if (article.isAppendix) metaParts.push("APPENDIX")
  else metaParts.push(`CH.${String(article.index).padStart(2, "0")}`)
  if (article.isAdvanced) metaParts.push("ADV")

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group/article focus-visible:outline-tech-main block focus-visible:outline-2 focus-visible:outline-offset-2">
      <TechCard padding="compact" hover="border">
        <div className="flex items-center gap-3">
          <span className="text-tech-main/40 w-8 shrink-0 text-right font-mono text-xs">
            {String(rowIndex).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-tech-main-dark truncate text-sm font-medium">
              {article.title}
            </p>
            <p className="text-tech-main/50 mt-0.5 truncate font-mono text-[0.625rem] tracking-wider uppercase">
              {metaParts.join(" · ")}
              {article.author ? ` — ${article.author}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isCoAuthored && (
              <span className="border-tech-main/30 text-tech-main/60 border px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-wider uppercase">
                {coauthoredLabel}
              </span>
            )}
            <span
              aria-hidden="true"
              className="text-tech-main/40 group-hover/article:text-tech-signal transition-colors">
              →
            </span>
          </div>
        </div>
      </TechCard>
    </Link>
  )
}
