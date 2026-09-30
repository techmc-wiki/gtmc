// Adapted from Rare UI. Copyright (c) 2026 Swami Malode. See RARE-UI-LICENSE.
"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { addSiteScrollListener } from "@/hooks/site-scroll-root"

export type ProximitySection = {
  id: string
  label: string
  level: number
  element: HTMLElement
}

export default function ProximitySidebar({
  sections,
  ariaLabel,
}: {
  sections: ProximitySection[]
  ariaLabel: string
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const active = sections.findLast(
        ({ element }) => element.getBoundingClientRect().top <= 128
      )
      setActiveId(active?.id ?? sections[0]?.id)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    const removeScrollListener = addSiteScrollListener(schedule, {
      passive: true,
    })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      removeScrollListener()
      window.removeEventListener("resize", schedule)
    }
  }, [sections])

  return (
    <nav
      data-slot="proximity-sidebar"
      aria-label={ariaLabel}
      className="reader-proximity pointer-events-none absolute inset-y-0 right-0 flex w-72 [scrollbar-width:none] flex-col overflow-y-auto overscroll-contain">
      <div
        className="pointer-events-none my-auto ml-auto shrink-0 py-1"
        onPointerMove={(event) =>
          event.currentTarget.style.setProperty(
            "--pointer-y",
            String(
              event.clientY -
                event.currentTarget.getBoundingClientRect().top -
                4
            )
          )
        }
        onPointerLeave={(event) =>
          event.currentTarget.style.removeProperty("--pointer-y")
        }>
        {sections.map((section, index) => (
          <a
            key={section.id}
            href={`#${encodeURIComponent(section.id)}`}
            aria-label={section.label}
            aria-current={section.id === activeId ? "location" : undefined}
            data-level={section.level}
            style={
              {
                "--row-y": index * 24 + 12,
                "--dash-scale": Math.max(0.25, 1 - section.level * 0.2),
              } as CSSProperties
            }
            className="focus-visible:outline-tech-signal pointer-events-auto relative ml-auto flex h-6 w-12 items-center justify-end pr-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
            onClick={(event) => {
              event.preventDefault()
              section.element.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "instant"
                  : "smooth",
                block: "start",
              })
              window.history.replaceState(
                window.history.state,
                "",
                `#${encodeURIComponent(section.id)}`
              )
              setActiveId(section.id)
              event.currentTarget.blur()
            }}>
            <span
              aria-hidden
              className="reader-outline-label bg-surface-overlay text-foreground border-tech-line pointer-events-auto absolute right-12 max-w-60 truncate border px-2 py-1 text-sm shadow-sm">
              {section.label}
            </span>
            <span
              aria-hidden
              className="reader-proximity-dash bg-muted-foreground/60 h-px w-8 origin-right"
            />
          </a>
        ))}
      </div>
    </nav>
  )
}
