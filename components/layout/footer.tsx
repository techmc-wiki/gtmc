import { getLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Logo } from "@/components/ui/logo"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { TechBadge } from "@/components/ui/status-badge"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { articleUrl } from "@/lib/articles/url"
import { getManifestStats, type ArticleLocale } from "@/lib/articles/manifest"

export default async function Footer() {
  const locale = (await getLocale()) as ArticleLocale
  const t = await getTranslations({ locale, namespace: "Footer" })
  const stats = getManifestStats(locale)
  const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown"
  const startYear = 2024
  const currentYear = stats.lastRevision
    ? Number(stats.lastRevision.slice(0, 4))
    : startYear
  const lastRevision = stats.lastRevision
    ? new Date(stats.lastRevision).toISOString().slice(0, 10)
    : "—"

  return (
    <footer
      aria-label="Site information"
      className="border-tech-main-dark bg-tech-bg/80 relative mt-auto w-full border-t-2 pt-10 pb-12">
      <div className="bg-tech-signal absolute top-0 left-0 h-0.5 w-24" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top status strip */}
        <div className="text-tech-main/55 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs tracking-[0.18em] uppercase">
          <span className="border-tech-main/30 inline-flex items-center gap-2 border-l pl-4 first:border-l-0 first:pl-0">
            <span className="bg-tech-signal inline-block size-1.5 motion-safe:animate-pulse" />
            SYS.ONLINE
          </span>
          <span className="border-tech-main/30 border-l pl-4 first:border-l-0 first:pl-0">
            LAST REVISION: {lastRevision}
          </span>
          <span className="border-tech-main/30 border-l pl-4 first:border-l-0 first:pl-0">
            BUILD {buildSha}
          </span>
        </div>

        <div className="relative mt-12">
          <CornerBrackets
            variant="static"
            size="size-2"
            color="border-tech-main/40"
            corners="all"
          />

          {/* Main grid — brand column + title-block grid */}
          <div className="md:grid md:grid-cols-12 md:gap-10">
            {/* Brand column */}
            <div className="mb-8 md:col-span-4 md:mb-0 md:p-4">
              <Logo size="md" />
              <p className="text-tech-main mt-4 font-mono text-xs tracking-wider uppercase">
                Graduate Texts in Minecraft
              </p>
              <p className="text-tech-main mt-2 max-w-xs text-sm/relaxed">
                {t("tagline")}
              </p>
            </div>

            {/* Title-block grid */}
            <div className="md:col-span-8">
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {[
                  { label: "ARTICLES", value: stats.articleCount },
                  { label: "AUTHORS", value: stats.authorCount },
                  { label: "EDITION", value: `${startYear}–${currentYear}` },
                  {
                    label: "STATUS",
                    value: (
                      <TechBadge className="border-tech-main/30 bg-tech-main/10 text-tech-main-dark">
                        [ BETA ]
                      </TechBadge>
                    ),
                  },
                  {
                    label: "CONTENT LICENSE",
                    value: (
                      <a
                        href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                        CC BY-NC-SA 4.0
                      </a>
                    ),
                  },
                  {
                    label: "CODE LICENSE",
                    value: (
                      <a
                        href="https://github.com/gtmc-dev/gtmc-web/blob/main/LICENSE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                        Apache-2.0
                      </a>
                    ),
                  },
                  {
                    label: "REVISION",
                    value: <code>{buildSha}</code>,
                  },
                  {
                    label: "LAST UPDATE",
                    value: <span>{lastRevision}</span>,
                  },
                ].map((cell) => (
                  <div
                    key={cell.label}
                    className="bg-tech-main/3 border-tech-main/10 border px-4 py-3.5 font-mono">
                    <div className="text-tech-main/50 mb-1 text-[0.625rem] tracking-[0.12em] uppercase">
                      {cell.label}
                    </div>
                    <div className="text-tech-main-dark font-mono text-sm wrap-break-word">
                      {cell.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Link grid */}
        <div className="my-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <nav aria-label={t("sectionRead")}>
            <h3 className="section-label">{t("sectionRead")}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <Link
                  href={articleUrl("Preface")}
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("linkPreface")}
                </Link>
              </li>
              <li>
                <Link
                  href="/articles"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("linkArticles")}
                </Link>
              </li>
              <li>
                <Link
                  href="/glossary"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("linkGlossary")}
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={t("sectionCommunity")}>
            <h3 className="section-label">{t("sectionCommunity")}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <Link
                  href="/draft"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("linkContribute")}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/gtmc-dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("linkTeam")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/gtmc-dev/gtmc-web/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("linkIssues")}
                </a>
              </li>
            </ul>
          </nav>
          <nav aria-label={t("sectionSource")}>
            <h3 className="section-label">{t("sectionSource")}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <Link
                  href="/features"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("linkFeedback")}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/gtmc-dev/gtmc-web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("linkRepository")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/gtmc-dev/gtmc-web/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  Apache-2.0
                </a>
              </li>
            </ul>
          </nav>
          <nav aria-label={t("sectionDownload")}>
            <h3 className="section-label">{t("sectionDownload")}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <Link
                  href="/pdf"
                  className="text-tech-main hover:text-tech-main-dark hover:decoration-tech-main/40 focus-visible:outline-tech-main text-sm transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {t("offlinePdf")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-tech-main/15 my-8 border-t" />

        {/* Colophon */}
        <div className="gap-6 md:flex md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-tech-main/70 text-xs/relaxed">
              {t("disclaimer")}
            </p>
            <p className="text-tech-main/55 mt-2 text-xs/relaxed">
              {t("attribution")}
            </p>
          </div>
          <div className="mt-6 flex flex-col items-start gap-3 md:mt-0 md:items-end">
            <p className="text-tech-main/70 text-xs">
              {t("copyright", { start: startYear, year: currentYear })}
            </p>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="border-tech-main/15 my-8 border-t" />
      </div>
    </footer>
  )
}
