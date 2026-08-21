import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"
import { Link } from "@/i18n/navigation"
import { DownloadButton } from "@/components/mdx/download-button"
import { PixelDissolve } from "@/components/mdx/pixel-dissolve"
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
  // secondary links. The PixelDissolve field is the interactive
  // centerpiece — pixels bloom under the cursor like blocks materializing.
  return (
    <div className="page-container-pb">
      <div className="mx-auto flex max-w-xl flex-col items-center pt-10 text-center md:pt-16">
        <h1 className="display-title text-tech-main-dark text-3xl text-balance md:text-4xl">
          {t("bookTitle")}
        </h1>
        <p className="text-tech-main mt-2 text-base/relaxed">
          {t("bookSubtitle")}
        </p>

        <PixelDissolve className="mt-10 w-full rounded-none px-6 py-12 sm:px-12 sm:py-14">
          <DownloadButton
            filename={filename}
            unavailableNote={t("unavailableNote")}>
            {t("downloadButton")}
          </DownloadButton>
        </PixelDissolve>

        <p className="text-tech-main/60 mt-5 text-sm">
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
  )
}
