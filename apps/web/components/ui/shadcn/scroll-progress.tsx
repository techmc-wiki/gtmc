// Rare UI. Copyright (c) 2026 Swami Malode. See RARE-UI-LICENSE.
"use client"

import * as React from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  type MotionValue,
  useSpring,
} from "motion/react"

import { cn } from "@/lib/cn"

export type ScrollProgressSection = {
  id: string
  label: string
  element: HTMLElement
}
const EMPTY_SECTIONS: ScrollProgressSection[] = []

const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const
const EASE_OUT = [0.22, 1, 0.36, 1] as const
const SIZE_SPRING = { type: "spring", bounce: 0.16, duration: 0.5 } as const
const LABEL_CROSSFADE = { duration: 0.22, ease: EASE_OUT } as const
const LAYER_FADE = { duration: 0.24, ease: EASE_IN_OUT } as const
const SQUIRCLE = "[corner-shape:squircle]"

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

type Size = { width: number; height: number }
type Progress = MotionValue<number>

export type ScrollProgressProps = React.ComponentProps<"div"> & {
  sections?: ScrollProgressSection[]
  containerRef?: React.RefObject<HTMLElement | null>
  offset?: number
  ariaLabel?: string
}

/** Tracks which section sits under the anchor line, pausing while a jump scrolls. */
function useActiveSection({
  sections,
  containerRef,
  offset,
  reduceMotion,
}: {
  sections: ScrollProgressSection[]
  containerRef?: React.RefObject<HTMLElement | null>
  offset: number
  reduceMotion: boolean | null
}) {
  const [activeId, setActiveId] = React.useState(sections[0]?.id)
  const scrollLock = React.useRef(false)
  const scrollLockTimer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => {
    const scroller = containerRef?.current ?? window

    const update = () => {
      if (scrollLock.current) return
      const anchor =
        (containerRef?.current?.getBoundingClientRect().top ?? 0) + offset
      const active = sections.findLast(
        ({ element }) => element.getBoundingClientRect().top <= anchor
      )
      setActiveId(active?.id ?? sections[0]?.id)
    }

    update()
    scroller.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      scroller.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [sections, containerRef, offset])

  React.useEffect(() => () => clearTimeout(scrollLockTimer.current), [])

  const select = (id: string) => {
    scrollLock.current = true
    clearTimeout(scrollLockTimer.current)
    scrollLockTimer.current = window.setTimeout(
      () => {
        scrollLock.current = false
      },
      reduceMotion ? 0 : 700
    )
    setActiveId(id)
  }

  return { activeId, select }
}

/** Measures the collapsed pill, its label, and the open list so the surface can spring between them. */
function useMeasuredSizes(sections: ScrollProgressSection[]) {
  const collapsedRef = React.useRef<HTMLDivElement>(null)
  const openRef = React.useRef<HTMLDivElement>(null)
  const labelRef = React.useRef<HTMLSpanElement>(null)

  const [collapsedSize, setCollapsedSize] = React.useState<Size>()
  const [openSize, setOpenSize] = React.useState<Size>()
  const [labelWidth, setLabelWidth] = React.useState<number>()

  useIsoLayoutEffect(() => {
    const measure = () => {
      if (labelRef.current) setLabelWidth(labelRef.current.offsetWidth)
      if (collapsedRef.current) {
        setCollapsedSize({
          width: collapsedRef.current.offsetWidth,
          height: collapsedRef.current.offsetHeight,
        })
      }
      if (openRef.current) {
        setOpenSize({
          width: openRef.current.offsetWidth,
          height: openRef.current.offsetHeight,
        })
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    if (labelRef.current) ro.observe(labelRef.current)
    if (collapsedRef.current) ro.observe(collapsedRef.current)
    if (openRef.current) ro.observe(openRef.current)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [sections])

  return {
    collapsedRef,
    openRef,
    labelRef,
    collapsedSize,
    openSize,
    labelWidth,
  }
}

/** Closes the open list on an outside pointer press or Escape. Escape also flags focus restoration. */
function useDismiss({
  open,
  rootRef,
  setOpen,
  armRestore,
}: {
  open: boolean
  rootRef: React.RefObject<HTMLDivElement | null>
  setOpen: (open: boolean) => void
  armRestore: () => void
}) {
  React.useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      armRestore()
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, rootRef, setOpen, armRestore])
}

/**
 * Owns focus across an open and close cycle. Opening moves focus onto the
 * first section. `armRestore` marks the next close as one that should return
 * focus to the trigger, which keyboard and selection dismissals do.
 */
function useOutlineFocus({
  open,
  listRef,
  triggerRef,
}: {
  open: boolean
  listRef: React.RefObject<HTMLUListElement | null>
  triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
  const restore = React.useRef(false)

  React.useEffect(() => {
    if (open) {
      listRef.current
        ?.querySelector<HTMLButtonElement>("[data-active]")
        ?.focus({ preventScroll: true })
    } else if (restore.current) {
      restore.current = false
      triggerRef.current?.focus({ preventScroll: true })
    }
  }, [open, listRef, triggerRef])

  const armRestore = React.useCallback(() => {
    restore.current = true
  }, [])

  return { armRestore }
}

function ProgressPill({
  triggerRef,
  ariaLabel,
  progress,
  labelWidth,
  labelSlot,
  reduceMotion,
  onOpen,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  ariaLabel: string
  progress: Progress
  labelWidth?: number
  labelSlot: React.ReactNode
  reduceMotion: boolean | null
  onOpen: () => void
}) {
  return (
    <motion.button
      ref={triggerRef}
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="absolute inset-0 flex min-h-11 items-center gap-2.5 py-1.5 pr-4 pl-2"
      initial={{
        opacity: 0,
        filter: reduceMotion ? undefined : "blur(4px)",
      }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{
        opacity: 0,
        filter: reduceMotion ? undefined : "blur(4px)",
      }}
      transition={LAYER_FADE}>
      <span className="shrink-0">
        <svg viewBox="0 0 24 24" className="h-5 w-5 -rotate-90" aria-hidden>
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            strokeWidth="2.5"
            className="stroke-foreground/15"
          />
          <motion.circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-foreground"
            style={{ pathLength: progress }}
          />
        </svg>
      </span>

      <span className="relative h-5 shrink-0" style={{ width: labelWidth }}>
        {labelSlot}
      </span>
    </motion.button>
  )
}

function SectionList({
  sections,
  activeId,
  layoutId,
  reduceMotion,
  listRef,
  onSelect,
}: {
  sections: ScrollProgressSection[]
  activeId?: string
  layoutId: string
  reduceMotion: boolean | null
  listRef: React.RefObject<HTMLUListElement | null>
  onSelect: (id: string) => void
}) {
  return (
    <motion.ul
      ref={listRef}
      className="absolute inset-0 flex flex-col overflow-y-auto p-1.5"
      initial={{
        opacity: 0,
        filter: reduceMotion ? undefined : "blur(4px)",
      }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{
        opacity: 0,
        filter: reduceMotion ? undefined : "blur(4px)",
      }}
      transition={LAYER_FADE}>
      {sections.map((s, i) => {
        const isActive = s.id === activeId
        return (
          <li key={s.id}>
            <button
              type="button"
              data-active={isActive || undefined}
              onClick={() => onSelect(s.id)}
              className={cn(
                "relative flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-medium leading-none transition-colors",
                SQUIRCLE,
                isActive
                  ? "text-foreground"
                  : "text-foreground/55 hover:text-foreground/80"
              )}>
              {isActive && (
                <motion.span
                  layoutId={`${layoutId}-active`}
                  className={cn(
                    "absolute inset-0 rounded-[14px] bg-foreground/10",
                    SQUIRCLE
                  )}
                  transition={reduceMotion ? { duration: 0 } : SIZE_SPRING}
                />
              )}
              <motion.span
                className={cn(
                  "relative h-1.5 w-1.5 shrink-0 rounded-full",
                  isActive ? "bg-foreground" : "bg-foreground/30"
                )}
                initial={
                  reduceMotion
                    ? undefined
                    : { opacity: 0, y: 4, filter: "blur(3px)" }
                }
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.3,
                  ease: EASE_IN_OUT,
                  delay: reduceMotion ? 0 : 0.04 + i * 0.03,
                }}
              />
              <motion.span
                className="relative min-w-0 truncate whitespace-nowrap"
                initial={
                  reduceMotion
                    ? undefined
                    : { opacity: 0, y: 4, filter: "blur(3px)" }
                }
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.3,
                  ease: EASE_IN_OUT,
                  delay: reduceMotion ? 0 : 0.04 + i * 0.03,
                }}>
                {s.label}
              </motion.span>
            </button>
          </li>
        )
      })}
    </motion.ul>
  )
}

/** Off-screen copy of the pill and the open list, used only to measure their natural sizes. */
function SizeProbe({
  sections,
  label,
  collapsedRef,
  labelRef,
  openRef,
}: {
  sections: ScrollProgressSection[]
  label?: string
  collapsedRef: React.RefObject<HTMLDivElement | null>
  labelRef: React.RefObject<HTMLSpanElement | null>
  openRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="pointer-events-none invisible absolute" aria-hidden>
      <div
        ref={collapsedRef}
        className="inline-flex min-h-11 items-center gap-2.5 py-1.5 pr-4 pl-2">
        <span className="h-5 w-5" />
        <span
          ref={labelRef}
          className="max-w-[min(42vw,14rem)] truncate text-sm leading-none font-medium whitespace-nowrap">
          {label}
        </span>
      </div>
      <div
        ref={openRef}
        className="max-h-[min(60dvh,28rem)] w-[min(90vw,22rem)] overflow-y-auto p-1.5">
        {sections.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 px-3 py-2 text-sm leading-none font-medium">
            <span className="h-1.5 w-1.5" />
            <span className="truncate whitespace-nowrap">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ScrollProgress = ({
  className,
  sections = EMPTY_SECTIONS,
  containerRef,
  offset = 120,
  ariaLabel = "Show sections",
  ...props
}: ScrollProgressProps) => {
  const layoutId = React.useId()
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll(
    containerRef ? { container: containerRef } : undefined
  )
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  })

  const { activeId, select } = useActiveSection({
    sections,
    containerRef,
    offset,
    reduceMotion,
  })
  const label = sections.find((s) => s.id === activeId)?.label

  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const {
    collapsedRef,
    openRef,
    labelRef,
    collapsedSize,
    openSize,
    labelWidth,
  } = useMeasuredSizes(sections)
  const { armRestore } = useOutlineFocus({ open, listRef, triggerRef })
  useDismiss({ open, rootRef, setOpen, armRestore })

  const selectSection = (id: string) => {
    select(id)
    armRestore()
    setOpen(false)
    sections
      .find((section) => section.id === id)
      ?.element.scrollIntoView({
        behavior: reduceMotion ? "instant" : "smooth",
        block: "start",
      })
  }

  const size = open ? openSize : collapsedSize
  const radius = open ? 26 : (collapsedSize?.height ?? 32) / 2

  return (
    <div
      ref={rootRef}
      data-slot="scroll-progress"
      className={cn("fixed bottom-6 left-1/2 z-40 -translate-x-1/2", className)}
      {...props}>
      <SizeProbe
        sections={sections}
        label={label}
        collapsedRef={collapsedRef}
        labelRef={labelRef}
        openRef={openRef}
      />

      {size && (
        <motion.div
          data-slot="scroll-progress-surface"
          className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 overflow-hidden border border-border bg-surface-overlay shadow-sm",
            SQUIRCLE
          )}
          initial={false}
          animate={{
            width: size.width,
            height: size.height,
            borderRadius: radius,
          }}
          transition={reduceMotion ? { duration: 0 } : SIZE_SPRING}>
          <AnimatePresence initial={false} mode="popLayout">
            {open ? (
              <SectionList
                key="list"
                sections={sections}
                activeId={activeId}
                layoutId={layoutId}
                reduceMotion={reduceMotion}
                listRef={listRef}
                onSelect={selectSection}
              />
            ) : (
              <ProgressPill
                key="pill"
                triggerRef={triggerRef}
                ariaLabel={ariaLabel}
                progress={progress}
                labelWidth={labelWidth}
                labelSlot={
                  <AnimatePresence initial={false}>
                    {label && (
                      <motion.span
                        key={label}
                        data-slot="scroll-progress-label"
                        className="text-foreground absolute inset-y-0 left-0 flex max-w-[min(42vw,14rem)] items-center truncate text-sm leading-none font-medium whitespace-nowrap"
                        initial={
                          reduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, filter: "blur(1.5px)" }
                        }
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={
                          reduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, filter: "blur(1.5px)" }
                        }
                        transition={LABEL_CROSSFADE}>
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                }
                reduceMotion={reduceMotion}
                onOpen={() => setOpen(true)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

export { ScrollProgress }
export default ScrollProgress
