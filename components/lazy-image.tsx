"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"

interface LazyImageProps {
  src: string
  alt: string
}

export function LazyImage({ src, alt }: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px", threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleLoad = useCallback(() => {
    setStatus("loaded")
  }, [])

  const handleError = useCallback(() => {
    setStatus("error")
  }, [])

  return (
    <div ref={containerRef} className="relative my-8 aspect-video max-w-full">
      <div
        className={`
          absolute inset-0 z-10 flex flex-col border border-tech-main/30
          bg-tech-main/5 p-1 shadow-sm
          ${
            status === "loaded"
              ? `
                pointer-events-none animate-skeleton-exit opacity-0
                motion-reduce:animate-fade-out
              `
              : ""
          }
        `}
        aria-hidden="true">
        <div
          className="
            relative flex size-full flex-1 items-center justify-center
            overflow-hidden bg-tech-accent/10
          ">
          <div
            className="
              absolute top-0 left-0 size-2 border-t-2 border-l-2
              border-tech-main/30
            "
          />
          <div
            className="
              absolute top-0 right-0 size-2 border-t-2 border-r-2
              border-tech-main/30
            "
          />
          <div
            className="
              absolute bottom-0 left-0 size-2 border-b-2 border-l-2
              border-tech-main/30
            "
          />
          <div
            className="
              absolute right-0 bottom-0 size-2 border-r-2 border-b-2
              border-tech-main/30
            "
          />

          <span
            className="
              relative z-10 text-[0.5625rem] tracking-widest text-tech-main/40
              uppercase select-none
            ">
            {status === "error" ? "// LOAD_FAIL" : "// IMG_LOAD"}
          </span>

          {status === "loading" && (
            <div
              className="
                absolute inset-0 animate-blueprint-sweep bg-linear-to-r
                from-transparent via-tech-accent/30 to-transparent
                motion-reduce:animate-none
              "
            />
          )}
        </div>
      </div>

      {shouldLoad && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
          onLoad={handleLoad}
          onError={handleError}
          className={`
            border border-tech-main/30 bg-tech-main/5 object-contain p-1
            shadow-sm
            ${
              status === "loaded"
                ? `
                  animate-fade-in
                  motion-reduce:animate-none
                `
                : "opacity-0"
            }
          `}
          unoptimized={src.includes("/api/assets")}
        />
      )}
    </div>
  )
}
