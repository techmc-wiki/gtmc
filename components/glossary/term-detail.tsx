"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { PageHeader, SectionTitle } from "@/components/ui/headings"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { CrossRefChips } from "@/components/glossary/cross-ref-chips"
import { TranslationsList } from "@/components/glossary/translations-list"
import { parseRelated } from "@/lib/glossary/related"
import { useModalEffects } from "@/hooks/use-modal-effects"
import type { GlossaryEntryBase } from "@/lib/glossary/manifest"
import type { GlossaryIndexEntry } from "@/lib/glossary/localized-index"

interface TermDetailProps {
  entry: GlossaryEntryBase
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
    <div className="border-tech-line/10 mt-auto border-t pt-6">
      <Link
        href={`/glossary/edit/new?prefill=${encodeURIComponent(slug)}`}
        locale={locale as "en" | "zh"}
        className="border-tech-main/40 hover:bg-tech-main/10 inline-block border px-4 py-2 font-mono text-xs tracking-widest uppercase transition-colors">
        [{t("detailEditCta")}]
      </Link>
    </div>
  )
}

export function TermDetail({ entry, locale, slug }: TermDetailProps) {
  const t = useTranslations("Glossary")
  const parsedRelated = React.useMemo(
    () => parseRelated(entry.related),
    [entry.related]
  )

  const hasRegex = entry.regex.trim().length > 0
  const hasRelated = parsedRelated.length > 0
  const hasShortForm = entry.shortForm.trim().length > 0

  const headerAction = React.useMemo(
    () =>
      entry.isControversial ? (
        <ControversyBadge label={t("controversialBadge")} />
      ) : undefined,
    [entry.isControversial, t]
  )

  return (
    <div className="flex min-h-full flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader title={entry.fullFormEn} action={headerAction} />
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

interface GlossaryDetailPanelProps {
  entry: GlossaryIndexEntry | null
  locale: string
  onClose: () => void
}

/** Modal dialog hosting `TermDetail`, opened from the glossary index. */
export function GlossaryDetailPanel({
  entry,
  locale,
  onClose,
}: GlossaryDetailPanelProps) {
  const t = useTranslations("Glossary")
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const isOpen = entry !== null

  useModalEffects({ isOpen, onClose })

  React.useEffect(() => {
    if (!entry) return
    closeButtonRef.current?.focus({ preventScroll: true })
  }, [entry])

  if (!entry) return null

  const titleId = `glossary-detail-panel-${entry.slug}`

  return (
    <div className="fixed inset-0 z-60">
      <button
        type="button"
        aria-label={t("detailPanelClose")}
        onClick={onClose}
        className="bg-tech-main-dark/15 absolute inset-0 w-full cursor-default backdrop-blur-[2px]"
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby={titleId}
        className="border-tech-main/40 animate-tech-pop-in bg-surface-modal/95 fixed inset-x-3 inset-y-3 m-0 flex h-auto max-h-none w-auto max-w-none flex-col overflow-hidden border backdrop-blur-md motion-reduce:animate-none sm:left-auto sm:w-[min(44rem,calc(100vw-2rem))]">
        <CornerBrackets size="size-3" color="border-tech-main/40" />
        <div className="border-tech-main/20 bg-surface-overlay/85 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-sm">
          <p className="text-tech-main/50 truncate font-mono text-xs tracking-widest uppercase">
            {entry.category}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("detailPanelClose")}
            className="focus-visible:outline-tech-main text-tech-main hover:bg-tech-main/10 border-tech-main/30 bg-surface-overlay/60 relative flex size-9 shrink-0 cursor-pointer items-center justify-center border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2">
            <span
              aria-hidden="true"
              className="absolute h-px w-3.5 rotate-45 bg-current"
            />
            <span
              aria-hidden="true"
              className="absolute h-px w-3.5 -rotate-45 bg-current"
            />
          </button>
        </div>
        <div className="custom-vertical-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <h2 id={titleId} className="sr-only">
            {entry.fullFormEn}
          </h2>
          <TermDetail entry={entry} locale={locale} slug={entry.slug} />
        </div>
      </dialog>
    </div>
  )
}
