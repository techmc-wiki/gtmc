import { TechCard } from "@/components/ui/tech-card"
import { TechButton } from "@/components/ui/tech-button"
import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"
import { toAbsoluteUrl } from "@/lib/site-url"
import { cacheLife } from "next/cache"
import { stat } from "node:fs/promises"
import path from "node:path"

async function getPdfMetadata(locale: string) {
  "use cache"

  cacheLife("max")

  const filename = `gtmc-${locale}.pdf`
  const pdfPath = path.join(process.cwd(), "public", filename)
  const { size } = await stat(pdfPath)

  return { filename, sizeInMegabytes: size / 1024 ** 2 }
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
  const t = await getTranslations("Pdf")
  const { filename, sizeInMegabytes } = await getPdfMetadata(locale)

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-12 sm:py-20">
      <TechCard
        padding="spacious"
        hover="border"
        brackets="visible"
        bracketVariant="hover-expand"
        pattern="grid"
        className="w-full">
        <div className="text-tech-main/60 mb-6 font-mono text-[10px] tracking-[0.2em] uppercase">
          {t("label")}
        </div>

        <h1 className="text-tech-main-dark mb-2 text-xl font-bold tracking-tight sm:text-2xl">
          {t("title")}
        </h1>

        <p className="text-tech-main/80 mb-8 text-sm leading-relaxed">
          {t("subtitle")}
        </p>

        <div className="border-tech-line/40 mb-6 flex items-center gap-4 border-t pt-6">
          <div className="text-tech-main/60 flex items-center gap-2 font-mono text-xs">
            <span className="border-tech-main/40 bg-tech-main/10 inline-block size-2 border" />
            {filename}
          </div>
          <div className="text-tech-main/40 font-mono text-xs">
            {sizeInMegabytes.toFixed(1)} MB
          </div>
        </div>

        <a href={`/${filename}`} download>
          <TechButton variant="primary" size="lg" className="w-full sm:w-auto">
            {t("download")}
          </TechButton>
        </a>
      </TechCard>
    </div>
  )
}
