import { Microscope } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/cn"

/**
 * Decorative markers are hidden from assistive technology; standalone markers
 * expose the advanced-material label.
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
