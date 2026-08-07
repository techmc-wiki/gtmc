import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"
import { toAbsoluteUrl } from "@/lib/site-url"
import type { ArticleLocale } from "@/lib/articles/manifest"
import PdfContentEn from "@/content/pdf/en.mdx"
import PdfContentZh from "@/content/pdf/zh.mdx"

const pdfContentByLocale = {
  en: PdfContentEn,
  zh: PdfContentZh,
} as const

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
  const filename = `gtmc-${locale}.pdf`
  const Content = pdfContentByLocale[locale as ArticleLocale]

  return (
    <div className="page-container-pb">
      <Content filename={filename} />
    </div>
  )
}
