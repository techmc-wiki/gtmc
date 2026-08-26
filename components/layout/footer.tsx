import { getLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Logo } from "@/components/ui/logo"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ChapterEndMark } from "@/components/articles/chapter-chrome"
import { Separator } from "@/components/ui/shadcn/separator"
import { articleUrl } from "@/lib/articles/url"
import { getManifestStats, type ArticleLocale } from "@/lib/articles/manifest"
import type { ReactNode } from "react"

interface FooterSectionProps {
  label: string
  children: ReactNode
}

function FooterSection({ label, children }: FooterSectionProps) {
  return (
    <nav aria-label={label}>
      <h3 className="section-label">{label}</h3>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </nav>
  )
}

interface FooterLinkItem {
  href: string
  label: string
  external?: boolean
}

function FooterLink({ href, label, external }: FooterLinkItem) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="footer-link text-tech-main text-sm">
        {label}
      </a>
    )
  }
  return (
    <Link href={href} className="footer-link text-tech-main text-sm">
      {label}
    </Link>
  )
}

interface RecordRowProps {
  term: string
  value: ReactNode
}

/** One ledger line of the printing record. */
function RecordRow({ term, value }: RecordRowProps) {
  return (
    <div className="border-tech-main/10 flex items-baseline justify-between gap-4 border-b py-2">
      <dt className="text-tech-main/50 text-[0.625rem] tracking-[0.12em] uppercase">
        {term}
      </dt>
      <dd className="text-tech-main-dark font-mono text-sm wrap-break-word tabular-nums">
        {value}
      </dd>
    </div>
  )
}

export default async function Footer() {
  const locale = (await getLocale()) as ArticleLocale
  const t = await getTranslations({ locale, namespace: "Footer" })
  const stats = getManifestStats(locale)
  const startYear = 2024
  const currentYear = stats.lastRevision
    ? Number(stats.lastRevision.slice(0, 4))
    : startYear
  const revised = stats.lastRevision
    ? new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
      }).format(new Date(stats.lastRevision))
    : "—"
  const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA

  // The index groups the community, contribution, and source destinations;
  // reading routes live in the top nav, so they are not repeated here.
  const sections: Array<{ label: string; links: FooterLinkItem[] }> = [
    {
      label: t("sectionCommunity"),
      links: [
        { href: "/about", label: t("linkAbout") },
        { href: "/authors", label: t("linkAuthors") },
        {
          href: "https://github.com/techmc-wiki",
          label: t("linkTeam"),
          external: true,
        },
        {
          href: "https://qm.qq.com/q/IIaL1EnBuY",
          label: t("linkQqGroup"),
          external: true,
        },
      ],
    },
    {
      label: t("sectionContribute"),
      links: [
        { href: "/draft", label: t("linkContribute") },
        { href: "/editorial-policy", label: t("linkEditorialPolicy") },
        {
          href: "https://github.com/techmc-wiki/gtmc/issues",
          label: t("linkIssues"),
          external: true,
        },
      ],
    },
    {
      label: t("sectionSource"),
      links: [
        {
          href: "https://github.com/techmc-wiki/gtmc",
          label: t("linkRepository"),
          external: true,
        },
        {
          href: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
          label: "CC BY-NC-SA 4.0",
          external: true,
        },
        {
          href: "https://github.com/techmc-wiki/gtmc/blob/main/LICENSE",
          label: "Apache-2.0",
          external: true,
        },
      ],
    },
  ]

  return (
    <footer
      aria-label="Site information"
      className="border-tech-main-dark bg-tech-bg relative mt-auto w-full border-t-2 before:pointer-events-none before:absolute before:inset-0 before:z-[-1] before:bg-[url('/bg-grid.svg')] before:bg-size-[24px_24px] before:opacity-[0.04]">
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Imprint band */}
        <div className="grid gap-10 py-8 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <Logo size="lg" />
            <p className="display-title text-tech-main-dark mt-6 text-2xl md:text-4xl">
              Graduate Texts in Minecraft
            </p>
            <p className="text-tech-main mt-3 max-w-md text-sm/relaxed">
              {t("slogan")}
            </p>
            <p className="mt-4">
              <Link
                href={articleUrl("Preface")}
                className="footer-link text-tech-main-dark text-sm font-medium">
                {t("linkPreface")}
                <span aria-hidden="true"> →</span>
              </Link>
            </p>
          </div>

          {/* Printing record */}
          <div className="guide-line md:col-span-5 md:border-l md:pl-8">
            <dl aria-label={t("recordHeading")}>
              <RecordRow
                term={t("recordArticles")}
                value={stats.articleCount}
              />
              <RecordRow term={t("recordAuthors")} value={stats.authorCount} />
              <RecordRow term={t("recordRevised")} value={revised} />
            </dl>
          </div>
        </div>

        <Separator className="bg-tech-main/15" />

        {/* Index band */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3">
          {sections.map((section) => (
            <FooterSection key={section.label} label={section.label}>
              {section.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <FooterLink {...link} />
                </li>
              ))}
            </FooterSection>
          ))}
        </div>

        {/* The book ends here — same device that closes each article */}
        <ChapterEndMark />

        {/* Colophon */}
        <div className="flex flex-col gap-6 pt-10 pb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-tech-main/70 text-xs/relaxed">
              {t("disclaimer")}
            </p>
            <p className="text-tech-main/55 text-xs/relaxed">
              {t("attribution")}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="text-tech-main/70 text-xs">
              {t("copyright", { start: startYear, year: currentYear })}
              {buildSha ? (
                <span className="text-tech-main/40 font-mono">
                  {" "}
                  · BUILD {buildSha}
                </span>
              ) : null}
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Closing wordmark — full-bleed spine stamp, like a back cover.
          Sized in container query units so the serif caps always span the
          viewport; the band clips the baseline for an anchored crop. */}
      <div
        aria-hidden="true"
        className="bg-tech-main-dark text-tech-bg @container w-full overflow-hidden select-none">
        <p className="display-title translate-y-[7%] text-center text-[31cqw] leading-[0.78] tracking-[-0.03em] whitespace-nowrap">
          GTMC
        </p>
      </div>
    </footer>
  )
}
