"use client"

import { useId, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/shadcn/button"

interface ChapterDisclosureProps {
  head: ReactNode
  panel: ReactNode
  sectionCountLabel: string
  expandLabel: string
  collapseLabel: string
}

/**
 * Keeps server-rendered chapter content mounted while closed; `inert` and
 * `aria-hidden` prevent interaction and screen-reader exposure, while CSS owns
 * the height and chevron transitions.
 */
export function ChapterDisclosure({
  head,
  panel,
  sectionCountLabel,
  expandLabel,
  collapseLabel,
}: ChapterDisclosureProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="t-acc" data-open={open ? "true" : "false"}>
      <div className="group/chapter flex items-baseline gap-4 sm:gap-6">
        {head}
        <Button
          variant="ghost"
          type="button"
          className="t-acc-head text-tech-main/70 hover:text-tech-main-dark min-h-11 shrink-0 gap-1.5 px-1.5 text-xs"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? collapseLabel : expandLabel}
          onClick={() => setOpen((value) => !value)}>
          <span aria-hidden="true">{sectionCountLabel}</span>
          <span className="t-acc-chevron" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4">
              <path d="M4 6L8 10L12 6" />
            </svg>
          </span>
        </Button>
      </div>
      <div className="t-acc-panel" id={panelId}>
        <div className="t-acc-panel-inner" inert={!open} aria-hidden={!open}>
          {panel}
        </div>
      </div>
    </div>
  )
}
