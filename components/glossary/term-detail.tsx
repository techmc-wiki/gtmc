"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { ArrowRight, X } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import { Badge } from "@/components/ui/shadcn/badge"
import { Button } from "@/components/ui/shadcn/button"
import { Link } from "@/i18n/navigation"
import { CrossRefChips } from "@/components/glossary/cross-ref-chips"
import { TranslationsList } from "@/components/glossary/translations-list"
import { parseRelated } from "@/lib/glossary/related"
import { Sheet, SheetContent, SheetClose } from "@/components/ui/shadcn/sheet"
import type { GlossaryEntryBase } from "@/lib/glossary/manifest"
import type { GlossaryIndexEntry } from "@/lib/glossary/localized-index"

interface TermDetailProps {
  entry: GlossaryEntryBase
  locale: string
  slug: string
  onOpenRelated: (slug: string) => void
}

function ControversyBadge({ label }: { label: string }) {
  return <Badge variant="pending">{label}</Badge>
}

function EditTermCta({ locale, slug }: { locale: string; slug: string }) {
  const t = useTranslations("Glossary")
  const { status } = useSession()

  if (status !== "authenticated") return null

  return (
    <div className="border-tech-line/20 border-t pt-5">
      <Button asChild variant="outline" className="w-full justify-between">
        <Link
          href={`/glossary/edit/new?prefill=${encodeURIComponent(slug)}`}
          locale={locale as "en" | "zh"}>
          <span>{t("detailEditCta")}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  )
}

function TermDetail({ entry, locale, slug, onOpenRelated }: TermDetailProps) {
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
        <h3 className="text-tech-main/60 mb-2 text-xs font-medium">
          {t("columnDescription")}
        </h3>
        <p className="text-tech-main-dark text-[0.9375rem]/7 wrap-break-word sm:text-base/7">
          {entry.description}
        </p>
      </section>

      {hasRegex && (
        <section className="border-tech-line/25 grid border-y py-4 sm:grid-cols-[8rem_1fr] sm:items-start sm:gap-4">
          <h3 className="text-tech-main/60 mb-2 text-xs font-medium sm:mb-0 sm:pt-0.5">
            {t("detailRegexLabel")}
          </h3>
          <code className="text-tech-main-dark bg-tech-main/4 border-tech-line/20 block border px-3 py-2 font-mono text-xs/5 wrap-break-word">
            {entry.regex}
          </code>
        </section>
      )}

      {hasRelated && (
        <section>
          <h3 className="text-tech-main/60 mb-3 text-xs font-medium">
            {t("detailRelatedLabel")}
          </h3>
          <CrossRefChips
            related={parsedRelated}
            mode="detail"
            locale={locale}
            onOpenDetail={onOpenRelated}
          />
        </section>
      )}

      <section>
        <h3 className="text-tech-main/60 mb-3 text-xs font-medium">
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

export function GlossaryDetailPanel({
  entry,
  locale,
  onClose,
  onOpenRelated,
}: GlossaryDetailPanelProps) {
  const t = useTranslations("Glossary")
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  if (!entry) return null

  const titleId = `glossary-detail-panel-${entry.slug}`
  const descriptionId = `${titleId}-description`
  const hasShortForm = entry.shortForm.trim().length > 0
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          headingRef.current?.focus()
        }}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="border-tech-main/35 bg-surface-modal w-full gap-0 p-0 sm:w-[min(34rem,calc(100vw-2rem))] sm:max-w-none">
        <header className="border-tech-main/25 bg-surface-overlay/95 relative flex shrink-0 items-start gap-4 border-b px-4 py-4 sm:px-6 sm:py-5">
          <span
            aria-hidden="true"
            className="bg-tech-signal h-10 w-1 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <h2
                ref={headingRef}
                tabIndex={-1}
                id={titleId}
                className="display-title text-tech-main-dark text-2xl leading-none tracking-tight text-balance outline-none sm:text-3xl">
                {entry.fullFormEn}
              </h2>
              {hasShortForm && (
                <span className="border-tech-line/25 text-tech-main/60 border px-1.5 py-0.5 font-mono text-xs tracking-wider uppercase">
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
          <SheetClose asChild>
            <IconButton
              type="button"
              variant="ghost"
              label={t("detailPanelClose")}>
              <X aria-hidden />
            </IconButton>
          </SheetClose>
        </header>
        <div className="custom-vertical-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-7">
          <TermDetail
            entry={entry}
            locale={locale}
            slug={entry.slug}
            onOpenRelated={onOpenRelated}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
