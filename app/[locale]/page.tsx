import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { HomepageClient } from "./_homepage/homepage-client"
import { TocSection } from "./_homepage/toc-section"
import { HomepageDraftingCanvas } from "./_homepage/drafting-canvas"
import { GridCursorProbe } from "./_homepage/grid-cursor-probe"
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

  return {
    title: {
      absolute: t("metaTitle"),
    },
    description: t("heroDescription"),
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
      <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative isolate flex w-full flex-col overflow-hidden font-sans">
        <HomepageDraftingCanvas />
        <GridCursorProbe />
        <section className="relative z-10 flex min-h-[calc(100dvh-4rem)] w-full md:min-h-[calc(100dvh-5rem)]">
          <HomepageClient />
        </section>
        <TocSection tree={tree} locale={normalizedLocale} />
      </div>
    </MainSiteShell>
  )
}
