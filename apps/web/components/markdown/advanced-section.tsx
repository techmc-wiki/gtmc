import { useId, type ReactNode } from "react"
import { ArrowDown } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/shadcn/button"
import { AdvancedMarker } from "@/components/articles/advanced-marker"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

/**
 * Mid-article deep dives reuse the advanced marker and expose a skip target so
 * readers can bypass optional content without an extra badge or action row.
 */
function AdvancedSection({
  children,
  headingId,
}: {
  children: ReactNode
  headingId?: string
}) {
  const t = useTranslations("AdvancedReading")
  const fallbackId = useId()
  const endId = `advanced-end-${headingId ?? fallbackId}`

  return (
    <section
      data-advanced-section="true"
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : t("sectionLabel")}
      className="advanced-section border-tech-advanced/40 my-10 min-w-0 border-l-2 py-1 pl-4 sm:pl-6">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-tech-main flex flex-wrap items-center gap-x-1.5 text-xs font-medium">
          <AdvancedMarker decorative className="mr-0.5" />
          <span className="text-tech-advanced">{t("label")}</span>
          <span>{t("optional")}</span>
        </span>
        <Button
          asChild
          variant="ghost"
          size="xs"
          className="text-tech-main -my-2 min-h-11 shrink-0 sm:min-h-0">
          <a href={`#${encodeURIComponent(endId)}`}>
            {t("skipSection")}
            <ArrowDown aria-hidden="true" />
          </a>
        </Button>
      </div>
      <div className="advanced-section-body min-w-0">{children}</div>
      <span id={endId} tabIndex={-1} className="sr-only">
        {t("sectionEnd")}
      </span>
    </section>
  )
}

export function AdvancedSectionDivComponent({
  children,
  "data-advanced-section": dataAdvancedSection,
  "data-advanced-heading": dataAdvancedHeading,
  node: _node,
  ...rest
}: MarkdownComponentProps) {
  if (dataAdvancedSection === "true") {
    return (
      <AdvancedSection
        headingId={
          typeof dataAdvancedHeading === "string"
            ? dataAdvancedHeading
            : undefined
        }>
        {children}
      </AdvancedSection>
    )
  }
  return <div {...rest}>{children}</div>
}
