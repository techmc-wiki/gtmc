import { HomepageClient } from "./_homepage/homepage-client"
import { TocSection } from "./_homepage/toc-section"
import { MainSiteShell } from "@/components/layout/main-site-shell"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/articles/manifest"

function normalizeLocale(locale: string): ArticleLocale {
  return locale === "en" ? "en" : "zh"
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
    <MainSiteShell fullBleed>
      <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex w-full flex-col font-sans">
        <section className="relative flex min-h-[calc(100dvh-4rem)] w-full overflow-hidden md:min-h-[calc(100dvh-5rem)]">
          <HomepageClient />
        </section>
        <TocSection tree={tree} locale={normalizedLocale} />
      </div>
    </MainSiteShell>
  )
}
