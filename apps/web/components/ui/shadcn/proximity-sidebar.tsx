// Adapted from Rare UI. Copyright (c) 2026 Swami Malode. See RARE-UI-LICENSE.
"use client"

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"

import { addSiteScrollListener } from "@/hooks/site-scroll-root"

/** Width of one blur layer's slice of the blend margin. */
const BLUR_STEP = 20
const OUTLINE_BLUR_LAYERS = [1, 2, 4, 8, 16].map((blur, index) => ({
  blur,
  style: {
    "--blur": `${blur}px`,
    "--fade-start": `${index * BLUR_STEP}px`,
    "--fade-end": `${(index + 1) * BLUR_STEP}px`,
  } as CSSProperties,
}))
/** Blend margin the stacked layers taper across, outside the widest label. */
const BLUR_BLEED = BLUR_STEP * OUTLINE_BLUR_LAYERS.length
/** How far the backdrop reaches above and below the outline rows. */
const BLUR_VERTICAL_BLEED = 64

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

export type ProximitySection = {
  id: string
  label: string
  level: number
  /** Heading flagged as advanced material in the article source. */
  advanced?: boolean
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
  const [expanded, setExpanded] = useState(false)
  const [metrics, setMetrics] = useState({ content: 0, label: 0 })
  const navRef = useRef<HTMLElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const expandedRef = useRef(false)

  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!nav || !active || !activeId) return
    // Scroll the outline so the active dash stays inside its own viewport; a
    // list taller than the reader would otherwise leave it below the fold.
    const navRect = nav.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const target = nav.scrollTop + activeRect.top - navRect.top - nav.clientHeight * 0.3
    nav.scrollTo({
      top: Math.max(0, target),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    })
  }, [activeId])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const active = sections.findLast(({ element }) => element.getBoundingClientRect().top <= 128)
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

  // The backdrop is measured from the widest title so it hugs the outline
  // instead of covering the navigation's whole (mostly empty) column, and every
  // title shares that width so their left edges line up.
  useIsoLayoutEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const labels = [...surface.querySelectorAll<HTMLElement>(".reader-outline-label")]
    const range = document.createRange()

    const measure = () => {
      const surfaceRight = surface.getBoundingClientRect().right
      let widest = 0
      let offset = 0
      for (const label of labels) {
        const rect = label.getBoundingClientRect()
        if (rect.width === 0) continue
        // Text width survives truncation; the box width does not.
        range.selectNodeContents(label)
        const textWidth = range.getBoundingClientRect().width
        const style = getComputedStyle(label)
        const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
        const maxWidth = Number.parseFloat(style.maxWidth)
        const natural = textWidth + padding
        const width = Number.isFinite(maxWidth) ? Math.min(natural, maxWidth) : natural
        if (width > widest) widest = width
        if (offset === 0) offset = surfaceRight - rect.right
      }
      const label = Math.round(widest)
      const content = Math.round(widest + offset)
      if (label <= 0 || content <= 0) return
      setMetrics((current) =>
        current.label === label && current.content === content ? current : { content, label },
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    for (const label of labels) observer.observe(label)
    return () => observer.disconnect()
  }, [sections])

  // The rail opens the panel exactly as before; from then on the blurred region
  // keeps it open, so it only collapses once the pointer leaves the backdrop.
  // Pointer tracking, rather than a hover layer, keeps the blurred article text
  // selectable underneath.
  useEffect(() => {
    const nav = navRef.current
    const surface = surfaceRef.current
    if (!nav || !surface) return
    let frame = 0
    let pointer: { x: number; y: number } | null = null

    const update = () => {
      frame = 0
      if (!pointer) return
      const navRect = nav.getBoundingClientRect()
      const surfaceRect = surface.getBoundingClientRect()
      if (surfaceRect.width === 0) return
      const left = Math.max(navRect.left, surfaceRect.right - metrics.content - BLUR_BLEED)
      const top = Math.max(navRect.top, surfaceRect.top - BLUR_VERTICAL_BLEED)
      const bottom = Math.min(navRect.bottom, surfaceRect.bottom + BLUR_VERTICAL_BLEED)
      const inside =
        pointer.x >= left && pointer.x <= navRect.right && pointer.y >= top && pointer.y <= bottom
      if (inside) {
        surface.style.setProperty("--pointer-y", String(pointer.y - surfaceRect.top - 4))
        // The rail opens the panel; the wider blurred region only keeps it open,
        // so sliding left over the article does not dismiss it.
        expandedRef.current = expandedRef.current || nav.matches(":hover")
      } else {
        surface.style.removeProperty("--pointer-y")
        expandedRef.current = false
      }
      setExpanded(expandedRef.current)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      pointer = { x: event.clientX, y: event.clientY }
      schedule()
    }

    const leave = () => {
      pointer = null
      cancelAnimationFrame(frame)
      frame = 0
      surface.style.removeProperty("--pointer-y")
      expandedRef.current = false
      setExpanded(false)
    }

    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("blur", leave)
    document.documentElement.addEventListener("pointerleave", leave)
    nav.addEventListener("scroll", schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("blur", leave)
      document.documentElement.removeEventListener("pointerleave", leave)
      nav.removeEventListener("scroll", schedule)
    }
  }, [metrics.content])

  return (
    <nav
      ref={navRef}
      data-slot="proximity-sidebar"
      data-expanded={expanded ? "true" : undefined}
      aria-label={ariaLabel}
      className="reader-proximity pointer-events-none absolute inset-y-0 right-0 flex w-96 [scrollbar-width:none] flex-col overflow-y-auto overscroll-contain">
      <div
        ref={surfaceRef}
        style={
          {
            "--outline-content-width": metrics.content ? `${metrics.content}px` : undefined,
            "--outline-label-width": metrics.label ? `${metrics.label}px` : undefined,
            "--outline-blur-bleed": `${BLUR_BLEED}px`,
          } as CSSProperties
        }
        className="reader-outline-surface pointer-events-none relative my-auto w-full shrink-0 py-1">
        {OUTLINE_BLUR_LAYERS.map(({ blur, style }) => (
          <span key={blur} aria-hidden className="reader-outline-blur" style={style} />
        ))}
        {sections.map((section, index) => (
          <a
            key={section.id}
            href={`#${encodeURIComponent(section.id)}`}
            aria-label={section.label}
            aria-current={section.id === activeId ? "location" : undefined}
            data-level={section.level}
            data-advanced={section.advanced ? "true" : undefined}
            style={
              {
                "--row-y": index * 24 + 12,
                "--dash-scale": Math.max(0.25, 1 - section.level * 0.2),
              } as CSSProperties
            }
            className="focus-visible:outline-tech-signal pointer-events-auto relative z-10 ml-auto flex h-6 w-12 items-center justify-end pr-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
            onClick={(event) => {
              event.preventDefault()
              section.element.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
                block: "start",
              })
              window.history.replaceState(
                window.history.state,
                "",
                `#${encodeURIComponent(section.id)}`,
              )
              setActiveId(section.id)
              event.currentTarget.blur()
            }}>
            <span
              aria-hidden
              className="reader-outline-label pointer-events-none absolute right-12 max-w-60 truncate px-3 text-sm leading-6">
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
