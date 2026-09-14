import { Microscope } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/cn"

/**
 * The level glyph for graduate-level material. A microscope reads as "under the
 * microscope": the research-grade depth these sections add. It stands in for a
 * text tag in the outline, contents, chapter tree, and imprint, so those rows
 * stay one line of prose.
 *
 * On its own the glyph carries the accessible name via a hidden label; beside
 * the visible "Advanced" wording (the deep-dive header) it is decoration, and is
 * hidden from assistive technology rather than announced twice.
 */
export function AdvancedMarker({
  decorative = false,
  className,
}: {
  decorative?: boolean
  className?: string
}) {
  const t = useTranslations("AdvancedReading")
  const classes = cn(
    "text-tech-advanced inline-flex shrink-0 items-center align-middle",
    className
  )

  if (decorative) {
    return (
      <span aria-hidden="true" className={classes}>
        <Microscope className="size-3.5" />
      </span>
    )
  }

  const label = t("label")

  return (
    <span title={label} className={classes}>
      <Microscope aria-hidden="true" className="size-3.5" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
