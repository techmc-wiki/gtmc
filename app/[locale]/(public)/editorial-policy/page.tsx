import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/ui/page-header"
import { SectionTitle } from "@/components/ui/section-title"
import { toAbsoluteUrl, getSiteUrl } from "@/lib/site-url"
import { buildWebPageJsonLd, serializeJsonLd } from "@/lib/seo/json-ld"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "EditorialPolicy" })
  const canonical = toAbsoluteUrl(`/${locale}/editorial-policy`)

  return {
    title: t("pageTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical,
      languages: {
        en: toAbsoluteUrl("/en/editorial-policy"),
        zh: toAbsoluteUrl("/zh/editorial-policy"),
        "x-default": toAbsoluteUrl("/zh/editorial-policy"),
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

export default async function EditorialPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "EditorialPolicy" })
  const siteUrl = getSiteUrl()

  const jsonLd = serializeJsonLd(
    buildWebPageJsonLd(
      siteUrl,
      `/${locale}/editorial-policy`,
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

      <aside className="border-tech-main/20 text-tech-main mt-8 border-l-2 px-4 text-xs/relaxed">
        <p>{t("sourceNote")}</p>
        <p className="mt-1 font-mono tracking-wider uppercase">
          <a
            href="https://github.com/gtmc-dev/Articles/blob/main/CONTRIBUTING.md"
            className="hover:text-tech-main-dark underline">
            {t("sourceContributing")}
          </a>
          {" · "}
          <a
            href="https://github.com/gtmc-dev/Articles/blob/main/REVIEWERS.md"
            className="hover:text-tech-main-dark underline">
            {t("sourceReviewers")}
          </a>
          {" · "}
          <a
            href="https://github.com/gtmc-dev/Articles/blob/main/CODE_OF_CONDUCT.zh.md"
            className="hover:text-tech-main-dark underline">
            {t("sourceConduct")}
          </a>
        </p>
        <p className="text-tech-main/60 mt-1">
          {t("lastReviewed", { date: "2026-06-28" })}
        </p>
      </aside>

      <section className="mt-10">
        <SectionTitle>{t("sectionSubmission")}</SectionTitle>
        <div className="text-tech-main max-w-3xl space-y-4 text-sm/relaxed">
          <p>{t("sectionSubmissionBody")}</p>
          <p>{t("sectionSubmissionBody2")}</p>
          <p>{t("sectionSubmissionBody3")}</p>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle>{t("sectionEditorialBoard")}</SectionTitle>
        <div className="text-tech-main max-w-3xl space-y-4 text-sm/relaxed">
          <p>{t("sectionEditorialBoardBody")}</p>
          <p>{t("sectionEditorialBoardBody2")}</p>
          <p>{t("sectionEditorialBoardBody3")}</p>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle>{t("sectionStandards")}</SectionTitle>
        <div className="text-tech-main max-w-3xl space-y-4 text-sm/relaxed">
          <p>{t("sectionStandardsBody")}</p>
          <p>{t("sectionStandardsBody2")}</p>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle>{t("sectionViolations")}</SectionTitle>
        <div className="text-tech-main max-w-3xl space-y-4 text-sm/relaxed">
          <p>{t("sectionViolationsBody")}</p>
          <p>{t("sectionViolationsBody2")}</p>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle>{t("sectionTranslation")}</SectionTitle>
        <div className="text-tech-main max-w-3xl space-y-4 text-sm/relaxed">
          <p>{t("sectionTranslationBody")}</p>
          <p>{t("sectionTranslationBody2")}</p>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle>{t("sectionLicense")}</SectionTitle>
        <div className="text-tech-main max-w-3xl space-y-4 text-sm/relaxed">
          <p>{t("sectionLicenseBody")}</p>
          <p>{t("sectionLicenseBody2")}</p>
        </div>
      </section>
    </div>
  )
}
