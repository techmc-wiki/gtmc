"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface LazyCodeBlockProps {
  lang: string
  lineCount: string
  children: ReactNode
}

export function LazyCodeBlock({ lineCount, children }: LazyCodeBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isSkeletonRemoved, setIsSkeletonRemoved] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px", threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const numLines = Math.min(parseInt(lineCount) || 8, 8)
  const lineWidths = [
    "w-3/4 bg-tech-accent/20",
    "w-1/2 bg-tech-accent/15",
    "w-5/6 bg-tech-accent/20",
    "w-2/5 bg-tech-accent/10",
    "w-3/5 bg-tech-accent/15",
    "w-4/5 bg-tech-accent/20",
    "w-1/3 bg-tech-accent/10",
    "w-2/3 bg-tech-accent/15",
  ]

  return (
    <div
      ref={containerRef}
      className="border-tech-main/30 bg-tech-bg relative my-6 w-full border font-mono text-sm"
      style={{ contentVisibility: "auto" }}>
      <div className="border-tech-main/30 pointer-events-none absolute top-0 left-0 z-20 size-3 -translate-px border-t-2 border-l-2" />
      <div className="border-tech-main/30 pointer-events-none absolute top-0 right-0 z-20 size-3 translate-x-px -translate-y-px border-t-2 border-r-2" />
      <div className="border-tech-main/30 pointer-events-none absolute bottom-0 left-0 z-20 size-3 -translate-x-px translate-y-px border-b-2 border-l-2" />
      <div className="border-tech-main/30 pointer-events-none absolute right-0 bottom-0 z-20 size-3 translate-px border-r-2 border-b-2" />

      <div
        className={
          isVisible ? `animate-fade-in motion-reduce:animate-none` : "opacity-0"
        }>
        {children}
      </div>

      {!isSkeletonRemoved && (
        <div
          className={`bg-tech-bg absolute inset-0 z-10 flex flex-col motion-reduce:transition-opacity motion-reduce:duration-250 ${
            isVisible
              ? `animate-skeleton-exit motion-reduce:animate-none motion-reduce:opacity-0`
              : ""
          } `}
          onAnimationEnd={() => {
            if (isVisible) setIsSkeletonRemoved(true)
          }}
          onTransitionEnd={() => {
            if (isVisible) setIsSkeletonRemoved(true)
          }}>
          <div className="border-tech-main/30 bg-tech-main/10 flex items-center justify-between border-b px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-tech-main/40 size-1.5 animate-pulse" />
              <span className="bg-tech-accent/20 h-2.5 w-12" />
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-tech-accent/15 h-2.5 w-16" />
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden px-4 py-3 sm:px-6">
            <div className="animate-blueprint-sweep via-tech-accent/30 pointer-events-none absolute inset-0 bg-linear-to-r from-transparent to-transparent motion-reduce:animate-none" />
            {Array.from({ length: numLines }).map((_, i) => (
              <div
                key={String(i)}
                className={`my-1.5 h-2 ${lineWidths[i % lineWidths.length]} `}
              />
            ))}
          </div>

          <div className="border-tech-main/10 flex items-center justify-end border-t px-4 py-1">
            <span className="text-tech-main/50 font-mono text-[0.5625rem] tracking-widest uppercase select-none">
              {"//"} SYNTAX_HIGHLIGHT
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
