import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { TechCard } from "@/components/ui/tech-card"
import { TermDetail } from "@/components/glossary/term-detail"
import { MentionedIn } from "@/components/glossary/mentioned-in"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"
import { getGlossaryEntry } from "@/lib/glossary/slug"
import { getSiteUrl } from "@/lib/site-url"

const MAX_DESCRIPTION_LENGTH = 160

async function getCachedGlossaryEntry(slug: string) {
  "use cache"
  cacheLife("days")
  return getGlossaryEntry(slug)
}

interface GlossarySlugPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { entries } = await loadGlossaryManifest()
  return entries.map((entry) => ({ slug: entry.slug }))
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export async function generateMetadata({
  params,
}: GlossarySlugPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const [entry, t] = await Promise.all([
    getCachedGlossaryEntry(slug),
    getTranslations({ locale, namespace: "Glossary" }),
  ])

  if (!entry) {
    return {
      title: t("pageTitle"),
      description: t("pageDescription"),
    }
  }

  const title = `${entry.fullFormEn} | ${t("pageTitle")}`
  const description = entry.description.trim().length
    ? truncate(entry.description, MAX_DESCRIPTION_LENGTH)
    : t("pageDescription")

  const siteUrl = getSiteUrl()
  const canonicalUrl = `${siteUrl}/${locale}/glossary/${entry.slug}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/en/glossary/${entry.slug}`,
        zh: `${siteUrl}/zh/glossary/${entry.slug}`,
        "x-default": `${siteUrl}/zh/glossary/${entry.slug}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  }
}

export default async function GlossarySlugPage({
  params,
}: GlossarySlugPageProps) {
  const { locale, slug } = await params
  const [entry, t] = await Promise.all([
    getCachedGlossaryEntry(slug),
    getTranslations({ locale, namespace: "Glossary" }),
  ])

  if (!entry) {
    notFound()
  }

  const siteUrl = getSiteUrl()
  const canonicalUrl = `${siteUrl}/${locale}/glossary/${entry.slug}`
  const glossaryIndexUrl = `${siteUrl}/${locale}/glossary`
  const description =
    entry.description.trim() || entry.fullFormEn || entry.shortForm

  const definedTermJsonLd: {
    "@context": "https://schema.org"
    "@type": "DefinedTerm"
    name: string
    description: string
    url: string
    inDefinedTermSet: {
      "@type": "DefinedTermSet"
      name: string
      url: string
    }
  } = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.fullFormEn,
    description,
    url: canonicalUrl,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Technical Minecraft Glossary",
      url: glossaryIndexUrl,
    },
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <nav>
        <Link
          href="/glossary"
          locale={locale as "en" | "zh"}
          className="text-tech-main/70 hover:text-tech-main-dark inline-flex items-center font-mono text-xs tracking-widest uppercase transition-colors">
          {t("detailBackToIndex")}
        </Link>
      </nav>

      <TechCard padding="spacious" tone="main" borderOpacity="muted">
        <TermDetail entry={entry} locale={locale} slug={slug} />
      </TechCard>

      <MentionedIn
        termName={entry.fullFormEn}
        shortForm={entry.shortForm}
        locale={locale === "en" ? "en" : "zh"}
      />

      <script type="application/ld+json">
        {JSON.stringify(definedTermJsonLd)}
      </script>
    </div>
  )
}
