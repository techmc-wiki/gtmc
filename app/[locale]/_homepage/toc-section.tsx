import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { articleUrl } from "@/lib/articles/url"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"

interface TocSectionProps {
  tree: ChapterNavNode[]
  locale: "en" | "zh"
}

function chapterSections(chapter: ChapterNavNode): ChapterNavNode[] {
  return chapter.children.filter(
    (child) => !child.isFolder && !child.isReadmeIntro
  )
}

function formatChapterNumber(chapter: ChapterNavNode): string {
  const index = chapter.index ?? -1
  if (chapter.isAppendix) {
    return index >= 1 && index <= 26 ? String.fromCharCode(64 + index) : "·"
  }
  return index >= 1 ? String(index).padStart(2, "0") : "·"
}

function formatSectionNumber(
  chapter: ChapterNavNode,
  section: ChapterNavNode
): string | null {
  const chapterIndex = chapter.index ?? -1
  const sectionIndex = section.index ?? -1
  if (chapterIndex < 1 || sectionIndex < 1) {
    return null
  }
  const chapterPart = chapter.isAppendix
    ? formatChapterNumber(chapter)
    : String(chapterIndex)
  return `${chapterPart}.${sectionIndex}`
}

function ChapterBlock({
  chapter,
  sectionCountLabel,
}: {
  chapter: ChapterNavNode
  sectionCountLabel: string
}) {
  const sections = chapterSections(chapter)

  return (
    <li>
      <div className="group/chapter flex items-baseline gap-4 sm:gap-6">
        <span className="display-title text-tech-main/35 text-2xl sm:text-3xl">
          {formatChapterNumber(chapter)}
        </span>
        <Link
          href={articleUrl(chapter.slug)}
          className="display-title text-tech-main-dark decoration-tech-signal grow text-xl underline-offset-4 transition-colors hover:underline sm:text-2xl">
          {chapter.title}
        </Link>
        {sections.length > 0 && (
          <span className="text-tech-main/50 hidden shrink-0 font-mono text-[0.625rem] tracking-[0.15em] uppercase sm:block">
            {sectionCountLabel}
          </span>
        )}
      </div>

      {sections.length > 0 && (
        <ol className="border-tech-main/20 mt-3 ml-2 flex flex-col border-l pl-6 sm:ml-3 sm:pl-9">
          {sections.map((section) => (
            <li key={section.id}>
              <Link
                href={articleUrl(section.slug)}
                className="group/section text-tech-main hover:text-tech-main-dark flex items-baseline gap-3 py-1.5 transition-colors">
                <span className="text-tech-main/50 shrink-0 font-mono text-xs">
                  {formatSectionNumber(chapter, section) ?? "·"}
                </span>
                <span className="text-sm sm:text-base">
                  {section.title}
                  {section.isAdvanced && (
                    <span className="bg-tech-advanced ml-2 inline-block px-1 py-px align-middle font-mono text-[0.5625rem] font-bold tracking-wider text-white uppercase">
                      ADV
                    </span>
                  )}
                </span>
                <span className="border-tech-main/25 mb-1 grow self-end border-b border-dotted" />
                <span className="text-tech-main/0 group-hover/section:text-tech-main-dark shrink-0 font-mono text-xs transition-colors">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

export async function TocSection({ tree, locale }: TocSectionProps) {
  const t = await getTranslations({ locale, namespace: "Homepage" })

  const preface = tree.find((node) => node.isPreface && !node.isFolder)
  const chapters = tree.filter((node) => node.isFolder && !node.isAppendix)
  const appendices = tree.filter((node) => node.isFolder && node.isAppendix)

  return (
    <section
      id="contents"
      aria-label={t("tocTitle")}
      className="relative z-10 mx-auto w-full max-w-3xl scroll-mt-16 px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
      <header className="mb-10 sm:mb-14">
        <p className="text-tech-main/60 mb-3 font-mono text-[0.625rem] tracking-[0.25em] uppercase">
          {t("tocKicker")}
        </p>
        <div className="flex items-end justify-between gap-4">
          <h2 className="display-title text-tech-main-dark text-4xl sm:text-5xl">
            {t("tocTitle")}
          </h2>
        </div>
        <div className="bg-tech-main-dark mt-4 h-0.5 w-full" />
        <div className="bg-tech-signal mt-1 h-1 w-16" />
      </header>

      <ol className="flex flex-col gap-10 sm:gap-12">
        {preface && (
          <li>
            <div className="flex items-baseline gap-4 sm:gap-6">
              <span className="display-title text-tech-main/35 text-2xl sm:text-3xl">
                00
              </span>
              <Link
                href={articleUrl(preface.slug)}
                className="display-title text-tech-main-dark decoration-tech-signal grow text-xl underline-offset-4 transition-colors hover:underline sm:text-2xl">
                {preface.title}
              </Link>
            </div>
          </li>
        )}

        {chapters.map((chapter) => (
          <ChapterBlock
            key={chapter.id}
            chapter={chapter}
            sectionCountLabel={t("sectionCount", {
              count: chapterSections(chapter).length,
            })}
          />
        ))}

        {appendices.length > 0 && (
          <li aria-label={t("appendixHeading")}>
            <div className="border-tech-main/30 mb-8 flex items-center gap-3 border-t pt-8">
              <span className="bg-tech-signal h-2.5 w-2.5" />
              <span className="text-tech-main/60 font-mono text-[0.625rem] font-bold tracking-[0.25em] uppercase">
                {t("appendixHeading")}
              </span>
            </div>
            <ol className="flex flex-col gap-10 sm:gap-12">
              {appendices.map((chapter) => (
                <ChapterBlock
                  key={chapter.id}
                  chapter={chapter}
                  sectionCountLabel={t("sectionCount", {
                    count: chapterSections(chapter).length,
                  })}
                />
              ))}
            </ol>
          </li>
        )}
      </ol>

      <nav
        aria-label={t("backMatterKicker")}
        className="border-tech-main/30 mt-16 border-t pt-10 sm:mt-20">
        <p className="text-tech-main/60 mb-6 font-mono text-[0.625rem] font-bold tracking-[0.25em] uppercase">
          {t("backMatterKicker")}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/glossary"
            className="group border-tech-main/40 hover:border-tech-main-dark hover:bg-tech-main-dark hover:text-tech-bg flex flex-col gap-2 border p-5 transition-colors">
            <span className="display-title text-lg">
              {t("glossaryCardTitle")}
            </span>
            <span className="text-tech-main group-hover:text-tech-bg/80 text-xs/relaxed transition-colors">
              {t("glossaryCardDesc")}
            </span>
          </Link>
          <Link
            href="/features"
            className="group border-tech-main/40 hover:border-tech-main-dark hover:bg-tech-main-dark hover:text-tech-bg flex flex-col gap-2 border p-5 transition-colors">
            <span className="display-title text-lg">
              {t("feedbackCardTitle")}
            </span>
            <span className="text-tech-main group-hover:text-tech-bg/80 text-xs/relaxed transition-colors">
              {t("feedbackCardDesc")}
            </span>
          </Link>
          <Link
            href="/draft"
            className="group border-tech-main/40 hover:border-tech-main-dark hover:bg-tech-main-dark hover:text-tech-bg flex flex-col gap-2 border p-5 transition-colors">
            <span className="display-title text-lg">
              {t("contributeCardTitle")}
            </span>
            <span className="text-tech-main group-hover:text-tech-bg/80 text-xs/relaxed transition-colors">
              {t("contributeCardDesc")}
            </span>
          </Link>
        </div>
      </nav>
    </section>
  )
}
