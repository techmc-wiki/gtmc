"use client"

import * as React from "react"
import { SessionProvider, useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { SectionTitle } from "@/components/ui/section-title"
import { CrossRefChips } from "@/components/glossary/cross-ref-chips"
import { TranslationsList } from "@/components/glossary/translations-list"
import { parseRelated } from "@/lib/glossary/related"
import type { GlossaryEntry } from "@/lib/glossary/manifest"

interface TermDetailProps {
  entry: GlossaryEntry
  locale: string
  slug: string
}

function ControversyBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 font-mono text-xs tracking-widest whitespace-nowrap text-yellow-700 uppercase"
      title={label}>
      <span aria-hidden="true">[*]</span>
      <span>{label}</span>
    </span>
  )
}

function EditTermCta({ locale, slug }: { locale: string; slug: string }) {
  const t = useTranslations("Glossary")
  const { status } = useSession()

  if (status !== "authenticated") return null

  return (
    <div className="border-tech-line/10 mt-8 border-t pt-6">
      <Link
        href={`/glossary/edit/new?prefill=${encodeURIComponent(slug)}`}
        locale={locale as "en" | "zh"}
        className="border-tech-main/40 hover:bg-tech-main/10 inline-block border px-4 py-2 font-mono text-xs tracking-widest uppercase transition-colors">
        [{t("detailEditCta")}]
      </Link>
    </div>
  )
}

function TermDetailContent({ entry, locale, slug }: TermDetailProps) {
  const t = useTranslations("Glossary")
  const parsedRelated = React.useMemo(
    () => parseRelated(entry.related),
    [entry.related]
  )

  const hasRegex = entry.regex.trim().length > 0
  const hasRelated = parsedRelated.length > 0
  const hasShortForm = entry.shortForm.trim().length > 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader
          title={entry.fullFormEn}
          subtitle={entry.category}
          action={
            entry.isControversial ? (
              <ControversyBadge label={t("controversialBadge")} />
            ) : undefined
          }
        />
        {hasShortForm && (
          <p className="text-tech-main/50 font-mono text-sm">
            {entry.shortForm}
          </p>
        )}
      </div>

      {hasRegex && (
        <section>
          <SectionTitle>{t("detailRegexLabel")}</SectionTitle>
          <code className="border-tech-line/30 text-tech-main-dark block border p-3 font-mono text-sm wrap-break-word">
            {entry.regex}
          </code>
        </section>
      )}

      <section>
        <SectionTitle>{t("columnDescription")}</SectionTitle>
        <p className="text-tech-main-dark text-base/relaxed wrap-break-word">
          {entry.description}
        </p>
      </section>

      {hasRelated && (
        <section>
          <SectionTitle>{t("detailRelatedLabel")}</SectionTitle>
          <CrossRefChips
            related={parsedRelated}
            mode="detail"
            locale={locale}
          />
        </section>
      )}

      <section>
        <SectionTitle>{t("detailTranslationsLabel")}</SectionTitle>
        <TranslationsList
          translations={entry.translations}
          activeLocale={locale}
        />
      </section>

      <EditTermCta locale={locale} slug={slug} />
    </div>
  )
}

export function TermDetail(props: TermDetailProps) {
  return (
    <SessionProvider>
      <TermDetailContent {...props} />
    </SessionProvider>
  )
}
