"use client"

import { useId, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/shadcn/button"

interface ChapterDisclosureProps {
  /** Server-rendered chapter number + title link. */
  head: ReactNode
  /** Server-rendered section list. */
  panel: ReactNode
  /** Visible label, e.g. "5 sections". */
  sectionCountLabel: string
  /** Button aria-labels with the chapter title already interpolated. */
  expandLabel: string
  collapseLabel: string
}

/**
 * Minimal client boundary for one expandable TOC chapter. Wraps
 * server-rendered nodes with the exact 21-accordion hooks
 * (`.t-acc[data-open]` + `.t-acc-head` / `.t-acc-chevron` /
 * `.t-acc-panel` > `.t-acc-panel-inner`); CSS owns the height +
 * chevron animation, no measurement or timers. Closed content stays
 * mounted but inert and aria-hidden at zero height.
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
