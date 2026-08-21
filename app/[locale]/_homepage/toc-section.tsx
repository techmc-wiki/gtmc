import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { collectAppendixGroups } from "@/lib/articles/navigation-data"
import { articleUrl } from "@/lib/articles/url"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"

interface TocSectionProps {
  tree: ChapterNavNode[]
  locale: "en" | "zh"
}

function chapterSections(chapter: ChapterNavNode): ChapterNavNode[] {
  const sections: ChapterNavNode[] = []

  for (const child of chapter.children) {
    if (child.isAppendix) continue
    if (child.isFolder) {
      sections.push(...chapterSections(child))
    } else if (!child.isReadmeIntro) {
      sections.push(child)
    }
  }

  return sections
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
  sectionIndex: number
): string | null {
  const chapterIndex = chapter.index ?? -1
  if (chapterIndex < 1 || sectionIndex < 1) {
    return null
  }
  const chapterPart = chapter.isAppendix
    ? formatChapterNumber(chapter)
    : String(chapterIndex)
  return `${chapterPart}.${sectionIndex}`
}

function ChapterRegistrationTick() {
  return (
    <span
      aria-hidden="true"
      className="bg-tech-main/20 lg:group-hover/chapter-entry:bg-tech-signal lg:group-focus-within/chapter-entry:bg-tech-signal absolute top-4 -left-14 hidden h-px w-13 origin-right scale-x-[0.38] transition-[scale,background-color,opacity] duration-300 motion-reduce:transition-none lg:block lg:group-focus-within/chapter-entry:scale-x-100 lg:group-hover/chapter-entry:scale-x-100"
    />
  )
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
    <li className="group/chapter-entry relative">
      <ChapterRegistrationTick />
      <div className="group/chapter flex items-baseline gap-4 sm:gap-6">
        <span className="display-title text-tech-main/35 group-hover/chapter-entry:text-tech-signal group-focus-within/chapter-entry:text-tech-signal text-2xl transition-colors duration-300 motion-reduce:transition-none sm:text-3xl">
          {formatChapterNumber(chapter)}
        </span>
        <Link
          href={articleUrl(chapter.slug)}
          className="display-title text-tech-main-dark decoration-tech-signal grow text-xl underline-offset-4 transition-colors hover:underline sm:text-2xl">
          {chapter.title}
        </Link>
        {sections.length > 0 && (
          <span className="text-tech-main/50 hidden shrink-0 text-xs sm:block">
            {sectionCountLabel}
          </span>
        )}
      </div>

      {sections.length > 0 && (
        <ol className="border-tech-main/20 mt-3 ml-2 flex flex-col border-l pl-6 sm:ml-3 sm:pl-9">
          {sections.map((section, index) => (
            <li key={section.id}>
              <Link
                href={articleUrl(section.slug)}
                className="group/section text-tech-main hover:text-tech-main-dark flex items-baseline gap-3 py-1.5 transition-colors">
                <span className="text-tech-main/50 shrink-0 font-mono text-xs">
                  {formatSectionNumber(chapter, index + 1) ?? "·"}
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
  const appendices = collectAppendixGroups(tree).map<ChapterNavNode>(
    ({ owner, nodes }, index) => ({
      id: owner.id,
      title: owner.title,
      slug: owner.slug,
      isFolder: true,
      parentId: null,
      children: owner.isFolder ? nodes : [],
      index: index + 1,
      isAppendix: true,
    })
  )

  return (
    <section
      id="contents"
      aria-label={t("tocTitle")}
      className="relative z-10 mx-auto w-full max-w-3xl scroll-mt-16 px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
      <div className="border-tech-main/40 bg-surface/80 border p-6 shadow-sm backdrop-blur-sm sm:p-10 lg:p-12">
        <header className="mb-10 sm:mb-14">
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
            <li className="group/chapter-entry relative">
              <ChapterRegistrationTick />
              <div className="flex items-baseline gap-4 sm:gap-6">
                <span className="display-title text-tech-main/35 group-hover/chapter-entry:text-tech-signal group-focus-within/chapter-entry:text-tech-signal text-2xl transition-colors duration-300 motion-reduce:transition-none sm:text-3xl">
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
                <span className="display-title text-tech-main-dark text-xl">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              href="/pdf"
              className="group border-tech-main/40 hover:border-tech-main-dark hover:bg-tech-main-dark hover:text-tech-bg flex flex-col gap-2 border p-5 transition-colors">
              <span className="display-title text-lg">{t("pdfCardTitle")}</span>
              <span className="text-tech-main group-hover:text-tech-bg/80 text-xs/relaxed transition-colors">
                {t("pdfCardDesc")}
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
      </div>
    </section>
  )
}
