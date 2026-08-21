import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
// oxlint-disable-next-line import/no-unassigned-import
import "./_homepage/homepage.css"
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
