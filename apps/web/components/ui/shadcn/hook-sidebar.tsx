// Adapted from Rare UI. Copyright (c) 2026 Swami Malode. See RARE-UI-LICENSE.
"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ComponentProps } from "react"
import { cn } from "@/lib/cn"

export type HookSidebarItem = {
  id: string
  label: string
  href?: string
  /** Nesting level, 0-based. Deeper rows indent to show hierarchy. */
  depth?: number
}

const ROW_PADDING_REM = 1
const DEPTH_STEP_REM = 1

const rowPadding = (depth: number) =>
  (ROW_PADDING_REM + depth * DEPTH_STEP_REM) * 16

/** Vertical gap the rail leaves above a row so the elbow can sit on its own. */
const CORNER = 6
/** Width of the elbow arc, matching the upstream corner radius. */
const ELBOW_ARC = 12
const RAIL_HEIGHT = 7

/**
 * The dashed rail plus the elbow that hooks it into a row. `y` is the row's
 * vertical centre; the rail stops `CORNER` above it so the elbow closes the gap.
 */
function Rail({
  from = 0,
  y,
  depth = 0,
  className,
}: {
  from?: number
  y: number | null
  depth?: number
  className?: string
}) {
  // The arc is fixed; only the horizontal run grows to reach an indented row.
  const width = Math.max(ELBOW_ARC, rowPadding(depth) - 4)

  return (
    <span
      aria-hidden
      style={{ opacity: y === null ? 0 : 1 }}
      className={cn(
        "reader-hook-rail pointer-events-none absolute inset-0",
        className
      )}>
      <span
        className="reader-hook-line absolute top-0 left-0.5 w-px"
        style={{
          height: Math.max(0, (y ?? 0) - CORNER - from),
          transform: `translateY(${from}px)`,
        }}
      />
      <svg
        width={width}
        height={RAIL_HEIGHT}
        viewBox={`0 0 ${width} ${RAIL_HEIGHT}`}
        fill="none"
        className="reader-hook-elbow absolute top-0 left-0.5"
        style={{ transform: `translateY(${(y ?? 0) - CORNER}px)` }}>
        <path
          d={`M0.5 0a6 6 0 0 0 6 6H${width}`}
          stroke="currentColor"
          strokeDasharray="2 2"
        />
      </svg>
    </span>
  )
}
export function HookSidebar({
  items,
  value,
  onNavigate,
  className,
  ...props
}: ComponentProps<"nav"> & {
  items: HookSidebarItem[]
  value: number
  onNavigate?: () => void
}) {
  const nav = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLAnchorElement | HTMLDivElement | null)[]>([])
  const [centers, setCenters] = useState<number[]>([])
  const [tops, setTops] = useState<number[]>([])
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    const measure = () => {
      setCenters(
        rows.current.map((row) =>
          row ? row.offsetTop + row.offsetHeight / 2 : 0
        )
      )
      setTops(rows.current.map((row) => (row ? row.offsetTop : 0)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (list.current) observer.observe(list.current)
    return () => observer.disconnect()
  }, [items])

  // Tracking pointer and focus natively keeps these listeners off the <nav>
  // element, which is not interactive.
  useEffect(() => {
    const element = nav.current
    if (!element) return
    const clear = (event: Event) => {
      const next = (event as FocusEvent).relatedTarget
      if (next && element.contains(next as Node)) return
      setHovered(null)
    }
    element.addEventListener("pointerleave", clear)
    element.addEventListener("focusout", clear)
    return () => {
      element.removeEventListener("pointerleave", clear)
      element.removeEventListener("focusout", clear)
    }
  }, [])

  const activeY = value < 0 ? null : (centers[value] ?? null)
  const hoverY = hovered === null ? null : (centers[hovered] ?? null)
  const activeDepth = value < 0 ? 0 : (items[value]?.depth ?? 0)
  const hoverDepth = hovered === null ? 0 : (items[hovered]?.depth ?? 0)

  // A chapter's rail starts below its header row, at the first child. Without
  // children the header is its own anchor.
  const chapterStart = (index: number) => {
    let root = index
    while (root > 0 && (items[root]?.depth ?? 0) > 0) root--
    if ((items[index]?.depth ?? 0) === 0) return tops[index] ?? 0
    return tops[root + 1] ?? tops[root] ?? 0
  }

  // Each chapter owns its rail, so the persistent one is rooted at the active
  // chapter rather than at the top of the whole list.
  const activeFrom = chapterStart(value)

  const hoverChapter = hovered === null ? -1 : chapterStart(hovered)

  // A hover in a different chapter has no accent rail under it, so that
  // chapter roots its own rail. Otherwise stay in the active chapter: above the
  // active row the accent rail already covers the span, so only the elbow
  // corner is drawn.
  const hoverFrom =
    hoverChapter >= 0 && hoverChapter !== activeFrom
      ? hoverChapter
      : activeY !== null && hoverY !== null && hoverY <= activeY
        ? Math.max(0, hoverY - CORNER)
        : (activeY ?? 0)

  return (
    <nav
      data-slot="hook-sidebar"
      className={cn("relative flex flex-col", className)}
      ref={nav}
      {...props}>
      <div ref={list} className="relative flex flex-col">
        <Rail
          from={hoverFrom}
          y={hovered === value ? null : hoverY}
          depth={hoverDepth}
          className="text-foreground/30"
        />
        <Rail
          from={activeFrom}
          y={activeY}
          depth={activeDepth}
          className="text-tech-signal"
        />
        {items.map((item, index) => {
          const active = index === value
          const depth = item.depth ?? 0
          const classNames = cn(
            "flex min-h-10 items-center text-sm leading-snug transition-colors hover:text-foreground focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
            active ? "font-medium text-foreground" : "text-muted-foreground"
          )
          const style = { paddingLeft: `${rowPadding(depth)}px` }
          return item.href ? (
            <Link
              key={item.id}
              ref={(element) => {
                rows.current[index] = element
              }}
              href={item.href}
              data-active={active || undefined}
              aria-current={active ? "page" : undefined}
              className={classNames}
              style={style}
              onPointerEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onNavigate={onNavigate}>
              {item.label}
            </Link>
          ) : (
            <div
              key={item.id}
              ref={(element) => {
                rows.current[index] = element
              }}
              className={cn(classNames, "font-medium")}
              style={style}
              onPointerEnter={() => setHovered(index)}>
              {item.label}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
