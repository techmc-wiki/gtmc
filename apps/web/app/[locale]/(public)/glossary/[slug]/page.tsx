import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { PageHeader } from "@/components/ui/headings"
import { Link } from "@/i18n/navigation"
import { getPrimaryGlossaryContent } from "@/lib/glossary/localized-index"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"
import { parseRelated } from "@/lib/glossary/related"
import { toAbsoluteUrl } from "@/lib/site-url"
import { serializeJsonLd } from "@/lib/seo/json-ld"

interface GlossaryTermPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams(): Promise<
  Array<{ locale: string; slug: string }>
> {
  const { entries } = await loadGlossaryManifest()

  return entries.flatMap((entry) =>
    ["en", "zh"].map((locale) => ({ locale, slug: entry.slug }))
  )
}

export async function generateMetadata({
  params,
}: GlossaryTermPageProps): Promise<Metadata> {
  const [{ locale, slug }, { entries }] = await Promise.all([
    params,
    loadGlossaryManifest(),
  ])
  const entry = entries.find((candidate) => candidate.slug === slug)

  if (!entry) notFound()

  const content = getPrimaryGlossaryContent(entry, locale)
  const canonical = toAbsoluteUrl(
    `/${locale}/glossary/${encodeURIComponent(entry.slug)}`
  )
  const description = content.description || entry.description
  const title = content.value

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: toAbsoluteUrl(`/en/glossary/${encodeURIComponent(entry.slug)}`),
        zh: toAbsoluteUrl(`/zh/glossary/${encodeURIComponent(entry.slug)}`),
        "x-default": toAbsoluteUrl(
          `/zh/glossary/${encodeURIComponent(entry.slug)}`
        ),
      },
    },
    openGraph: {
      type: "article",
      title,
      description,
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

export default async function GlossaryTermPage({
  params,
}: GlossaryTermPageProps) {
  const { locale, slug } = await params
  const [{ entries }, t] = await Promise.all([
    loadGlossaryManifest(),
    getTranslations({ locale, namespace: "Glossary" }),
  ])
  const entry = entries.find((candidate) => candidate.slug === slug)

  if (!entry) notFound()

  const content = getPrimaryGlossaryContent(entry, locale)
  const relatedTerms = parseRelated(entry.related)
  const canonicalPath = `/${locale}/glossary/${encodeURIComponent(entry.slug)}`
  const jsonLd = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: content.value,
    description: content.description || entry.description,
    termCode: entry.shortForm || undefined,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "GTMC Glossary",
      url: toAbsoluteUrl(`/${locale}/glossary`),
    },
    url: toAbsoluteUrl(canonicalPath),
  })

  return (
    <div className="page-container-pb">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />
      <nav aria-label="Breadcrumb" className="mt-8 mb-6">
        <Link
          href="/glossary"
          locale={locale as "en" | "zh"}
          className="text-tech-main/70 hover:text-tech-main-dark font-mono text-xs tracking-widest uppercase transition-colors">
          {t("pageTitle")}
        </Link>
      </nav>

      <article className="border-tech-main/25 bg-surface-overlay/60 border p-6 sm:p-8">
        <PageHeader title={content.value} />
        {entry.shortForm ? (
          <p className="text-tech-main/60 mt-2 font-mono text-sm">
            {entry.shortForm}
          </p>
        ) : null}
        {entry.isControversial ? (
          <p className="mt-4 inline-flex border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 font-mono text-xs text-yellow-700">
            {t("controversialBadge")}
          </p>
        ) : null}

        <section className="border-tech-line/20 mt-8 border-t pt-6">
          <h2 className="text-tech-main/60 mb-3 text-xs font-medium">
            {t("columnDescription")}
          </h2>
          <p className="text-tech-main-dark text-base/7 wrap-break-word">
            {content.description || entry.description}
          </p>
        </section>

        {entry.regex ? (
          <section className="border-tech-line/20 mt-8 border-t pt-6">
            <h2 className="text-tech-main/60 mb-3 text-xs font-medium">
              {t("detailRegexLabel")}
            </h2>
            <code className="text-tech-main-dark bg-tech-main/4 border-tech-line/20 block border px-3 py-2 font-mono text-xs/5 wrap-break-word">
              {entry.regex}
            </code>
          </section>
        ) : null}

        {relatedTerms.length > 0 ? (
          <section className="border-tech-line/20 mt-8 border-t pt-6">
            <h2 className="text-tech-main/60 mb-3 text-xs font-medium">
              {t("detailRelatedLabel")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {relatedTerms.map((related) => {
                const target = entries.find(
                  (candidate) => candidate.fullFormEn === related.target
                )
                if (!target) return null

                return (
                  <li key={`${related.kind}-${target.slug}`}>
                    <Link
                      href={`/glossary/${encodeURIComponent(target.slug)}`}
                      locale={locale as "en" | "zh"}
                      className="border-tech-line/40 text-tech-main/80 hover:text-tech-main hover:outline-tech-main/30 inline-flex border px-2 py-1 font-mono text-xs transition-[outline-color,color] hover:outline hover:outline-1">
                      {related.kind === "synonym"
                        ? t("relatedSynonymLabel")
                        : t("relatedSeeLabel")}{" "}
                      {target.fullFormEn}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {Object.keys(entry.translations).length > 0 ? (
          <section className="border-tech-line/20 mt-8 border-t pt-6">
            <h2 className="text-tech-main/60 mb-3 text-xs font-medium">
              {t("detailTranslationsLabel")}
            </h2>
            <dl className="border-tech-line/30 divide-tech-line/20 divide-y border">
              {Object.entries(entry.translations).map(
                ([translationLocale, translation]) => (
                  <div
                    key={translationLocale}
                    className="grid gap-2 px-3 py-3 sm:grid-cols-[5rem_1fr]">
                    <dt className="text-tech-main/45 font-mono text-xs uppercase">
                      {translationLocale}
                    </dt>
                    <dd className="text-tech-main-dark text-sm/relaxed">
                      <p lang={translationLocale}>{translation.value}</p>
                      {translation.description ? (
                        <p
                          lang={translationLocale}
                          className="text-tech-main/70 mt-1">
                          {translation.description}
                        </p>
                      ) : null}
                    </dd>
                  </div>
                )
              )}
            </dl>
          </section>
        ) : null}
      </article>
    </div>
  )
}
