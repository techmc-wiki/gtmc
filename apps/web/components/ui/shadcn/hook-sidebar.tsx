// Adapted from Rare UI. Copyright (c) 2026 Swami Malode. See RARE-UI-LICENSE.
"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ComponentProps } from "react"
import { cn } from "@/lib/cn"

export type HookSidebarItem = { id: string; label: string; href?: string }

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
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    const measure = () =>
      setCenters(
        rows.current.map((row) =>
          row ? row.offsetTop + row.offsetHeight / 2 : 0
        )
      )
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

  const activeY = centers[value] ?? 0
  const hoverY = centers[hovered ?? value] ?? activeY

  return (
    <nav
      data-slot="hook-sidebar"
      className={cn("relative flex flex-col", className)}
      ref={nav}
      {...props}>
      <div ref={list} className="relative flex flex-col">
        <span
          aria-hidden
          className="reader-hook-line text-tech-signal pointer-events-none absolute top-0 left-0 w-px"
          style={{
            height: Math.abs(hoverY - activeY),
            transform: `translateY(${Math.min(activeY, hoverY)}px)`,
          }}
        />
        <span
          aria-hidden
          className="reader-hook-tip bg-tech-signal pointer-events-none absolute top-0 left-0 size-2 -translate-x-1/2 rounded-full"
          style={{ transform: `translate(-50%, ${activeY}px)` }}
        />
        {items.map((item, index) => {
          const active = index === value
          const classNames = cn(
            "flex min-h-10 items-center pl-4 text-sm leading-snug transition-colors hover:text-foreground focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
            active ? "font-medium text-foreground" : "text-muted-foreground"
          )
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
              onPointerEnter={() => setHovered(index)}>
              {item.label}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
