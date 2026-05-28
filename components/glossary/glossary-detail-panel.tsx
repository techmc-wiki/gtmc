"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { useModalEffects } from "@/hooks/use-modal-effects"
import type { GlossaryEntry } from "@/lib/glossary/manifest"
import { TermDetail } from "./term-detail"

interface GlossaryDetailPanelProps {
  entry: GlossaryEntry | null
  locale: string
  onClose: () => void
}

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
        className="border-tech-main/40 animate-tech-pop-in fixed inset-x-3 inset-y-3 m-0 flex h-auto max-h-none w-auto max-w-none flex-col overflow-hidden border bg-white/95 backdrop-blur-md motion-reduce:animate-none sm:left-auto sm:w-[min(44rem,calc(100vw-2rem))]">
        <CornerBrackets size="size-3" color="border-tech-main/40" />
        <div className="border-tech-main/20 flex shrink-0 items-center justify-between gap-3 border-b bg-white/85 px-4 py-3 backdrop-blur-sm">
          <p className="text-tech-main/50 truncate font-mono text-xs tracking-widest uppercase">
            {entry.category}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("detailPanelClose")}
            className="focus-visible:outline-tech-main text-tech-main hover:bg-tech-main/10 border-tech-main/30 relative flex size-9 shrink-0 cursor-pointer items-center justify-center border bg-white/60 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2">
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
