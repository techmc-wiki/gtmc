"use client"

import { useEffect, useRef, useState } from "react"

interface LazyCodeBlockProps {
  lang: string
  lineCount: string
  children: React.ReactNode
}

export function LazyCodeBlock({
  lang,
  lineCount,
  children,
}: LazyCodeBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isSkeletonRemoved, setIsSkeletonRemoved] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px", threshold: 0 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const linesToRender = Math.min(parseInt(lineCount) || 8, 8)

  const lineStyles = [
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
      className="relative my-6 w-full border border-tech-main/30 bg-tech-bg font-mono text-sm"
      style={{ contentVisibility: "auto" }}>
      {/* 4 corner brackets */}
      <div className="absolute top-[-1px] left-[-1px] size-3 border-t-2 border-l-2 border-tech-main/30" />
      <div className="absolute top-[-1px] right-[-1px] size-3 border-t-2 border-r-2 border-tech-main/30" />
      <div className="absolute bottom-[-1px] left-[-1px] size-3 border-b-2 border-l-2 border-tech-main/30" />
      <div className="absolute bottom-[-1px] right-[-1px] size-3 border-b-2 border-r-2 border-tech-main/30" />

      {/* Actual Content - Hidden until visible */}
      <div
        className={`transition-opacity duration-800 ${
          isVisible ? "opacity-100 animate-fade-in" : "opacity-0"
        }`}>
        {children}
      </div>

      {/* Skeleton Overlay */}
      {!isSkeletonRemoved && (
        <div
          className={`absolute inset-0 bg-tech-bg flex flex-col z-10 motion-reduce:transition-opacity motion-reduce:duration-250 ${
            isVisible
              ? "animate-skeleton-exit motion-reduce:opacity-0 motion-reduce:animate-none"
              : ""
          }`}
          onAnimationEnd={(e) => {
            // Only trigger on the main skeleton exit animation
            if (e.animationName.includes("skeleton-exit") || isVisible) {
              setIsSkeletonRemoved(true)
            }
          }}
          // Fallback for motion-reduce
          onTransitionEnd={() => {
            if (isVisible) {
              setIsSkeletonRemoved(true)
            }
          }}>
          <div className="flex items-center justify-between border-b border-tech-main/30 bg-tech-main/10 px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="size-1.5 animate-pulse bg-tech-main/40" />
              <span className="w-12 h-2.5 bg-tech-accent/20" />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 h-2.5 bg-tech-accent/15" />
            </div>
          </div>

          <div className="relative flex-1 px-4 sm:px-6 py-3 overflow-hidden">
            <div className="absolute inset-0 animate-blueprint-sweep bg-linear-to-r from-transparent via-tech-accent/30 to-transparent motion-reduce:animate-none pointer-events-none" />

            {Array.from({ length: linesToRender }).map((_, index) => (
              <div
                key={String(index)}
                className={`h-2 my-1.5 ${lineStyles[index % lineStyles.length]}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-end border-t border-tech-main/10 px-4 py-1">
            <span className="font-mono text-[9px] tracking-widest text-tech-main/50 uppercase select-none">
              {"//"} SYNTAX_HIGHLIGHT
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
