// oxlint-disable-next-line import/no-unassigned-import
import "../public-content.css"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { PdfCoverPreview } from "@/components/mdx/pdf-cover-preview"
import { toAbsoluteUrl } from "@/lib/site-url"
import { getManifestStats } from "@/lib/articles/manifest"
import type { ArticleLocale } from "@/lib/articles/manifest"

function formatRevisionDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Pdf" })
  const canonical = toAbsoluteUrl(`/${locale}/pdf`)

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical,
      languages: {
        en: toAbsoluteUrl("/en/pdf"),
        zh: toAbsoluteUrl("/zh/pdf"),
        "x-default": toAbsoluteUrl("/zh/pdf"),
      },
    },
    openGraph: {
      type: "website",
      siteName: "Graduate Texts in Minecraft",
      url: canonical,
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Graduate Texts in Minecraft — Offline PDF",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: ["/opengraph-image"],
    },
  }
}

export default async function PdfPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const articleLocale = locale as ArticleLocale
  const t = await getTranslations({ locale, namespace: "Pdf" })
  const filename = `gtmc-${articleLocale}.pdf`
  const stats = getManifestStats(articleLocale)
  const lastRevision = stats.lastRevision
    ? formatRevisionDate(stats.lastRevision, locale)
    : null

  // Centered single-CTA layout (release/open-access download pattern):
  // one dominant action, trust metadata directly beneath it, quieter
  // secondary links. The PDF's rendered first page is the interactive
  // piece — a CanvasUI DecryptReveal that shows the cover as an ASCII
  // cipher and decodes it around the cursor (html-in-canvas browsers;
  // plain image fallback elsewhere). The cover itself is the download
  // link; title and metadata stay real HTML in both modes.
  return (
    <div className="page-container-pb flex w-full flex-1 flex-col justify-center">
      <div className="border-tech-main/40 bg-surface/80 mx-auto w-full max-w-xl border shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-center px-6 py-10 text-center sm:px-12 sm:py-12">
          <h1 className="display-title text-tech-main-dark text-3xl text-balance md:text-4xl">
            {t("bookTitle")}
          </h1>
          <p className="text-tech-main mt-2 text-base/relaxed">
            {t("bookSubtitle")}
          </p>

          <div className="mt-8">
            <PdfCoverPreview filename={filename} />
          </div>

          <p className="text-tech-main/60 mt-6 text-sm">
            {[
              t("metaArticles", { count: stats.articleCount }),
              lastRevision ? t("metaRevised", { date: lastRevision }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <Link
            href="/articles"
            className="text-tech-main hover:text-tech-main-dark decoration-tech-main/40 hover:decoration-tech-main-dark mt-3 underline underline-offset-4 transition-colors">
            {t("readOnline")}
          </Link>
        </div>
      </div>
    </div>
  )
}
