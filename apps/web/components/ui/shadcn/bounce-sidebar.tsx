// Rare UI. Copyright (c) 2026 Swami Malode. See RARE-UI-LICENSE.
"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react"
import Link from "next/link"
import { motion, useAnimate } from "motion/react"
import { arc } from "motion"
import { cn } from "@/lib/cn"

const MotionLink = motion.create(Link)

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

export type BounceSidebarItem =
  | string
  | { id?: string; label: string; href?: string }
  | { id?: string; label: string; heading: true }

export type BounceSidebarProps = Omit<ComponentProps<"ul">, "onChange"> & {
  items: BounceSidebarItem[]
  value?: number
  defaultValue?: number
  onChange?: (index: number) => void
  dotColor?: string
}

export function BounceSidebar({
  items,
  value,
  defaultValue = 0,
  onChange,
  dotColor = "var(--color-tech-signal)",
  className,
  ...props
}: BounceSidebarProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const activeIndex = value ?? internalValue

  const [dot, animate] = useAnimate<HTMLSpanElement>()
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const prevY = useRef<number | null>(null)

  const dotSize = 6
  const [ready, setReady] = useState(false)

  useIsomorphicLayoutEffect(() => {
    let cancelled = false
    const snap = () => {
      const el = itemRefs.current[activeIndex]
      if (cancelled || !el || !dot.current) return
      const dpr = window.devicePixelRatio || 1
      const size = Math.round(6 * dpr) / dpr
      const toY =
        Math.round((el.offsetTop + el.offsetHeight / 2 - size / 2) * dpr) / dpr
      animate(dot.current, { x: 0, y: toY }, { duration: 0 })
      prevY.current = toY
      setReady(true)
    }

    snap()
    const raf = requestAnimationFrame(snap)
    document.fonts?.ready.then(snap)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const el = itemRefs.current[activeIndex]
    if (!el || !dot.current) return

    const dpr = window.devicePixelRatio || 1
    const toY =
      Math.round((el.offsetTop + el.offsetHeight / 2 - dotSize / 2) * dpr) / dpr

    if (prevY.current === null) {
      animate(dot.current, { x: 0, y: toY }, { duration: 0 })
      prevY.current = toY
      return
    }

    const fromY = prevY.current
    const delta = toY - fromY
    prevY.current = toY
    if (delta === 0) return

    const distance = Math.abs(delta)
    const path = arc({
      strength: Math.min(0.8, 14 / distance),
      direction: delta > 0 ? "ccw" : "cw",
    })

    animate(
      dot.current,
      { x: 0, y: toY },
      { duration: 0.25, ease: "easeOut", path }
    )
  }, [activeIndex, animate, dot, dotSize])

  const select = (index: number) => {
    if (value === undefined) setInternalValue(index)
    onChange?.(index)
  }

  return (
    <ul
      data-slot="bounce-sidebar"
      className={cn("relative flex flex-col gap-1 pl-6", className)}
      {...props}>
      <span
        ref={dot}
        aria-hidden
        className="absolute top-0 left-2 rounded-full transition-opacity duration-150"
        style={{
          width: dotSize,
          height: dotSize,
          backgroundColor: dotColor,
          opacity: ready ? 1 : 0,
        }}
      />

      {items.map((item, index) => {
        const label = typeof item === "string" ? item : item.label
        const key =
          typeof item === "string"
            ? item
            : (item.id ??
              ("href" in item ? item.href : undefined) ??
              item.label)

        if (typeof item !== "string" && "heading" in item) {
          return (
            <li
              key={key}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              role="presentation"
              data-slot="bounce-sidebar-heading"
              className="text-muted-foreground px-1 pt-5 pb-1 font-mono text-xs first:pt-0">
              {label}
            </li>
          )
        }

        const href = typeof item === "string" ? undefined : item.href
        const isActive = index === activeIndex
        const itemClassName = cn(
          "flex min-h-10 w-full cursor-pointer items-center rounded-none px-1 py-2 text-left text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tech-main",
          isActive
            ? "font-medium text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )

        return (
          <li
            key={key}
            ref={(el) => {
              itemRefs.current[index] = el
            }}>
            {href ? (
              <MotionLink
                href={href}
                data-slot="bounce-sidebar-item"
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
                onClick={() => select(index)}
                className={itemClassName}>
                {label}
              </MotionLink>
            ) : (
              <motion.button
                type="button"
                data-slot="bounce-sidebar-item"
                data-active={isActive}
                onClick={() => select(index)}
                className={itemClassName}>
                {label}
              </motion.button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
