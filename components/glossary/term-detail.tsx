"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { CrossRefChips } from "@/components/glossary/cross-ref-chips"
import { TranslationsList } from "@/components/glossary/translations-list"
import { parseRelated } from "@/lib/glossary/related"
import { useModalEffects } from "@/hooks/use-modal-effects"
import { useMounted } from "@/hooks/use-mounted"
import type { GlossaryEntryBase } from "@/lib/glossary/manifest"
import type { GlossaryIndexEntry } from "@/lib/glossary/localized-index"

interface TermDetailProps {
  entry: GlossaryEntryBase
  locale: string
  slug: string
  onOpenRelated: (slug: string) => void
}

function ControversyBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex min-h-7 items-center gap-1 border border-yellow-500/40 bg-yellow-500/10 px-2 font-mono text-[0.625rem] tracking-widest whitespace-nowrap text-yellow-700 uppercase"
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
    <div className="border-tech-line/20 border-t pt-5">
      <Link
        href={`/glossary/edit/new?prefill=${encodeURIComponent(slug)}`}
        locale={locale as "en" | "zh"}
        className="border-tech-main/30 hover:border-tech-main/60 hover:bg-tech-main/5 focus-visible:outline-tech-main flex min-h-11 w-full items-center justify-between gap-4 border px-3 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">
        <span>{t("detailEditCta")}</span>
        <span aria-hidden="true">-&gt;</span>
      </Link>
    </div>
  )
}

export function TermDetail({
  entry,
  locale,
  slug,
  onOpenRelated,
}: TermDetailProps) {
  const t = useTranslations("Glossary")
  const parsedRelated = React.useMemo(
    () => parseRelated(entry.related),
    [entry.related]
  )

  const hasRegex = entry.regex.trim().length > 0
  const hasRelated = parsedRelated.length > 0

  return (
    <div className="flex flex-col gap-7">
      <section className="relative pl-4">
        <span
          aria-hidden="true"
          className="bg-tech-signal absolute top-1.5 bottom-1.5 left-0 w-0.5"
        />
        <h3 className="text-tech-main/55 mb-2 font-mono text-[0.625rem] tracking-[0.18em] uppercase">
          {t("columnDescription")}
        </h3>
        <p className="text-tech-main-dark text-[0.9375rem]/7 wrap-break-word sm:text-base/7">
          {entry.description}
        </p>
      </section>

      {hasRegex && (
        <section className="border-tech-line/25 grid border-y py-4 sm:grid-cols-[8rem_1fr] sm:items-start sm:gap-4">
          <h3 className="text-tech-main/55 mb-2 font-mono text-[0.625rem] tracking-[0.18em] uppercase sm:mb-0 sm:pt-0.5">
            {t("detailRegexLabel")}
          </h3>
          <code className="text-tech-main-dark bg-tech-main/4 border-tech-line/20 block border px-3 py-2 font-mono text-xs/5 wrap-break-word">
            {entry.regex}
          </code>
        </section>
      )}

      {hasRelated && (
        <section>
          <h3 className="text-tech-main/55 mb-3 font-mono text-[0.625rem] tracking-[0.18em] uppercase">
            {t("detailRelatedLabel")}
          </h3>
          <CrossRefChips
            related={parsedRelated}
            mode="detail"
            onOpenDetail={onOpenRelated}
          />
        </section>
      )}

      <section>
        <h3 className="text-tech-main/55 mb-3 font-mono text-[0.625rem] tracking-[0.18em] uppercase">
          {t("detailTranslationsLabel")}
        </h3>
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
  onOpenRelated: (slug: string) => void
}

/** Modal dialog hosting `TermDetail`, opened from the glossary index. */
export function GlossaryDetailPanel({
  entry,
  locale,
  onClose,
  onOpenRelated,
}: GlossaryDetailPanelProps) {
  const t = useTranslations("Glossary")
  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null)
  const isMounted = useMounted()
  const isOpen = entry !== null

  useModalEffects({ isOpen, onClose })

  React.useEffect(() => {
    if (!isOpen || !isMounted) return

    const dialog = dialogRef.current
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    if (!dialog?.open) dialog?.showModal()
    dialog?.focus({ preventScroll: true })

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose()
    }

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return

      const focusableElements = [
        ...dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((element) => element.getClientRects().length > 0)

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }

      const first = focusableElements[0]
      const last = focusableElements.at(-1)
      const activeElement = document.activeElement
      const focusIsOutside =
        activeElement instanceof Node && !dialog.contains(activeElement)

      if (
        event.shiftKey &&
        (activeElement === first || activeElement === dialog || focusIsOutside)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (activeElement === last || focusIsOutside)
      ) {
        event.preventDefault()
        first?.focus()
      }
    }

    dialog?.addEventListener("click", handleBackdropClick)
    document.addEventListener("keydown", handleTab, true)

    return () => {
      dialog?.removeEventListener("click", handleBackdropClick)
      document.removeEventListener("keydown", handleTab, true)
      if (dialog?.open) dialog.close()
      previouslyFocusedRef.current?.focus({ preventScroll: true })
      previouslyFocusedRef.current = null
    }
  }, [isOpen, isMounted, onClose])

  if (!entry || !isMounted) return null

  const titleId = `glossary-detail-panel-${entry.slug}`
  const descriptionId = `${titleId}-description`
  const hasShortForm = entry.shortForm.trim().length > 0

  return createPortal(
    <div className="fixed inset-0 z-60">
      <dialog
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault()
          onClose()
        }}
        className="border-tech-main/35 animate-tech-pop-in bg-surface-modal backdrop:bg-tech-main-dark/25 fixed inset-x-0 top-auto bottom-0 m-0 max-h-[calc(100dvh-0.75rem)] w-full max-w-none flex-col overflow-hidden border-x-0 border-t shadow-[-1.5rem_0_4rem_-2.5rem_rgb(15_23_42/0.55)] open:flex motion-reduce:animate-none sm:inset-y-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-none sm:w-[min(34rem,calc(100vw-2rem))] sm:border-y-0 sm:border-r-0 sm:border-l">
        <CornerBrackets size="size-3" color="border-tech-main/40" />
        <header className="border-tech-main/25 bg-surface-overlay/95 relative flex shrink-0 items-start gap-4 border-b px-4 py-4 sm:px-6 sm:py-5">
          <span
            aria-hidden="true"
            className="bg-tech-signal h-10 w-1 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <h2
                id={titleId}
                className="display-title text-tech-main-dark text-2xl leading-none tracking-tight text-balance sm:text-3xl">
                {entry.fullFormEn}
              </h2>
              {hasShortForm && (
                <span className="border-tech-line/25 text-tech-main/60 border px-1.5 py-0.5 font-mono text-[0.625rem] tracking-wider uppercase">
                  {entry.shortForm}
                </span>
              )}
              {entry.isControversial && (
                <ControversyBadge label={t("controversialBadge")} />
              )}
            </div>
            <p id={descriptionId} className="sr-only">
              {entry.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("detailPanelClose")}
            className="focus-visible:outline-tech-main text-tech-main hover:bg-tech-main/10 border-tech-main/30 bg-surface-overlay relative flex size-11 shrink-0 cursor-pointer items-center justify-center border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2">
            <span
              aria-hidden="true"
              className="absolute h-px w-4 rotate-45 bg-current"
            />
            <span
              aria-hidden="true"
              className="absolute h-px w-4 -rotate-45 bg-current"
            />
          </button>
        </header>
        <div className="custom-vertical-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-7">
          <TermDetail
            entry={entry}
            locale={locale}
            slug={entry.slug}
            onOpenRelated={onOpenRelated}
          />
        </div>
      </dialog>
    </div>,
    document.body
  )
}
