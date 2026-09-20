import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { HomepageClient } from "./_homepage/homepage-client"
import { HomepageDotGrid } from "./_homepage/homepage-dot-grid"
import { TocSection } from "./_homepage/toc-section"
import { MainSiteShell } from "@/components/layout/main-site-shell"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/articles/manifest"

function normalizeLocale(locale: string): ArticleLocale {
  return locale === "en" ? "en" : "zh"
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Homepage" })
  const metaTitle = t("metaTitle")
  const heroDescription = t("heroDescription")
  const canonical = `/${locale}`

  return {
    title: {
      absolute: metaTitle,
    },
    description: heroDescription,
    openGraph: {
      type: "website",
      siteName: "Graduate Texts in Minecraft",
      url: canonical,
      title: metaTitle,
      description: heroDescription,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: metaTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: heroDescription,
      images: ["/opengraph-image"],
    },
  }
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const normalizedLocale = normalizeLocale(locale)
  const tree = await getPublicChapterNav(normalizedLocale)

  return (
    <MainSiteShell fullBleed locale={locale}>
      <div className="bg-tech-bg text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative isolate flex w-full flex-col overflow-hidden font-sans">
        <HomepageDotGrid />
        <section className="relative z-10 flex min-h-[calc(100dvh-4rem)] w-full md:min-h-[calc(100dvh-5rem)]">
          <HomepageClient />
        </section>
        <TocSection tree={tree} locale={normalizedLocale} />
      </div>
    </MainSiteShell>
  )
}
