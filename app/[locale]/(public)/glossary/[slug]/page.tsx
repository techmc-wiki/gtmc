import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { TechCard } from "@/components/ui/tech-card"
import { TermDetail } from "@/components/glossary/term-detail"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"
import { getGlossaryEntry } from "@/lib/glossary/slug"
import { getSiteUrl } from "@/lib/site-url"

const MAX_DESCRIPTION_LENGTH = 160

interface GlossarySlugPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams(): { slug: string }[] {
  const { entries } = loadGlossaryManifest()
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
  const entry = getGlossaryEntry(slug)
  const t = await getTranslations({ locale, namespace: "Glossary" })

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
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export default async function GlossarySlugPage({
  params,
}: GlossarySlugPageProps) {
  const { locale, slug } = await params
  const entry = getGlossaryEntry(slug)

  if (!entry) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: "Glossary" })

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
    </div>
  )
}
