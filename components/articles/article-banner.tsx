"use client"

import Image from "next/image"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"

interface ArticleBannerProps {
  src: string
  alt: string
}

const PARALLAX_STRENGTH = 3
const IMG_PARALLAX_STRENGTH = 8

const blueprintGridStyle: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(to right, var(--color-tech-main) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-tech-main) 1px, transparent 1px)
  `,
  backgroundSize: "40px 40px",
}

export function ArticleBanner({ src, alt }: ArticleBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLElement>(null)
  const [hovered, setHovered] = useState(false)
  const [locked, setLocked] = useState(false)
  const [flashing, setFlashing] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const rafIdRef = useRef<number | null>(null)
  const lastMouseEventRef = useRef<MouseEvent | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const isReducedMotionRef = useRef(false)

  const updateRect = useCallback(() => {
    if (bannerRef.current) {
      rectRef.current = bannerRef.current.getBoundingClientRect()
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    isReducedMotionRef.current = mediaQuery.matches

    const handleChange = (e: MediaQueryListEvent) => {
      isReducedMotionRef.current = e.matches
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    updateRect()
    window.addEventListener("resize", updateRect)
    return () => window.removeEventListener("resize", updateRect)
  }, [updateRect])

  useEffect(() => {
    const banner = bannerRef.current
    if (!banner) return

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextIsVisible = entry?.isIntersecting ?? false
        setIsVisible(nextIsVisible)
        if (nextIsVisible) updateRect()
      },
      { rootMargin: "120px" }
    )

    observer.observe(banner)
    return () => observer.disconnect()
  }, [updateRect])

  useEffect(() => {
    if (locked || !isVisible || isReducedMotionRef.current) return

    const banner = bannerRef.current

    const processMouseMove = () => {
      rafIdRef.current = null
      const e = lastMouseEventRef.current
      if (!e || !rectRef.current || !banner) return

      const rect = rectRef.current
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (window.innerWidth / 2)
      const dy = (e.clientY - cy) / (window.innerHeight / 2)

      setOffset({ x: dx, y: dy })
      banner.style.setProperty("--parallax-x", `${dx}`)
      banner.style.setProperty("--parallax-y", `${dy}`)
    }

    const onMouseMove = (e: MouseEvent) => {
      lastMouseEventRef.current = e
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(processMouseMove)
      }
    }

    window.addEventListener("mousemove", onMouseMove)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [isVisible, locked])

  useEffect(() => {
    if (locked) return

    const checkScrollLock = () => {
      if (locked || !rectRef.current) return
      if (window.matchMedia("(pointer: coarse)").matches) {
        const rect = rectRef.current
        if (rect.bottom < window.innerHeight * 0.4) {
          setLocked(true)
          setFlashing(true)
          setTimeout(() => setFlashing(false), 400)
        }
      }
    }

    window.addEventListener("scroll", checkScrollLock, { passive: true })
    return () => window.removeEventListener("scroll", checkScrollLock)
  }, [locked])

  const handleFirstHover = useCallback(() => {
    if (locked) return
    setLocked(true)
    setFlashing(true)
    setTimeout(() => setFlashing(false), 400)
  }, [locked])

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    handleFirstHover()
  }, [handleFirstHover])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  const offsetX = offset.x
  const offsetY = offset.y

  const crosshairX = locked
    ? 50
    : hovered
      ? 50
      : 50 + offsetX * PARALLAX_STRENGTH
  const crosshairY = locked
    ? 50
    : hovered
      ? 50
      : 50 + offsetY * PARALLAX_STRENGTH
  const imgX = locked ? 0 : hovered ? 0 : -offsetX * IMG_PARALLAX_STRENGTH
  const imgY = locked ? 0 : hovered ? 0 : -offsetY * IMG_PARALLAX_STRENGTH

  const flashOverlayStyle = useMemo(
    (): React.CSSProperties => ({
      opacity: flashing ? 0.3 : 0,
      transition: flashing
        ? "opacity 120ms ease-in"
        : "opacity 80ms ease-out",
    }),
    [flashing]
  )

  const imageTransformStyle = useMemo(
    (): React.CSSProperties => ({
      transform: `translate(${imgX}px, ${imgY}px) scale(${hovered ? 1.1 : locked ? 1 : 1.06})`,
      filter: locked
        ? "blur(0px) saturate(1)"
        : "blur(1.5px) saturate(0.88)",
      transition: locked
        ? "transform 600ms cubic-bezier(0.16,1,0.3,1), filter 500ms ease-out"
        : hovered
          ? "transform 600ms cubic-bezier(0.16,1,0.3,1), filter 700ms cubic-bezier(0.16,1,0.3,1)"
          : "transform 200ms linear, filter 700ms cubic-bezier(0.16,1,0.3,1)",
    }),
    [imgX, imgY, hovered, locked]
  )

  const crosshairStyle = useMemo(
    (): React.CSSProperties => ({
      left: `${crosshairX}%`,
      top: `${crosshairY}%`,
      transform: "translate(-50%, -50%)",
      transition:
        locked || hovered
          ? "left 600ms cubic-bezier(0.16,1,0.3,1), top 600ms cubic-bezier(0.16,1,0.3,1)"
          : "none",
    }),
    [crosshairX, crosshairY, locked, hovered]
  )

  return (
    <div
      ref={bannerRef}
      className="
        group/banner relative mb-8 animate-fade-in
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:-translate-y-1.5
        hover:shadow-[0_16px_40px_rgb(var(--color-tech-main-dark)/0.16),0_4px_12px_rgb(var(--color-tech-main-dark)/0.10)]
      ">
      {/* Depth frame layers — expand outward on hover */}
      <div className="pointer-events-none absolute inset-0 border border-tech-main/15 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:-inset-2" />
      <div className="pointer-events-none absolute inset-0 border border-tech-main/8 transition-all delay-30 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:-inset-4" />

      {/* Outer frame */}
      <div className="relative border border-tech-main/40 bg-surface-overlay/60">
        {/* Top bar — monospace label strip */}
        <div
          className="
            flex items-center justify-between border-b border-tech-main/30
            bg-tech-main/5 px-3 py-1.5 font-mono text-[0.5rem]
            tracking-widest text-tech-main/50
          ">
          <span className="flex items-center gap-2">
            <span className="size-1.5 bg-tech-main/50" />
            IMG.BANNER
          </span>
          <span className="hidden sm:block">
            ISO 100 f/2.8 1/125s | 50mm Lens WB 5600K | EV +0.3 AF-S RAW
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1 bg-tech-main/30" />
            <span className="size-1 bg-tech-main/50" />
            <span className="size-1 bg-tech-main/70" />
          </span>
        </div>

        {/* Image container */}
        <figure
          ref={imgRef}
          aria-label={alt}
          className={`relative aspect-21/9 w-full overflow-hidden ${imageError ? "hidden" : ""}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
          {/* Shutter flash overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-20 bg-black"
            style={flashOverlayStyle}
          />

          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
            className="object-cover"
            style={imageTransformStyle}
            priority
            unoptimized={src.startsWith("/article-assets/")}
            onError={handleImageError}
          />

          {/* Blueprint grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-multiply transition-transform duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:scale-105"
            style={blueprintGridStyle}
          />

          {/* Vignette — deepens on hover */}
          <div
            className="
              pointer-events-none absolute inset-0 z-10 opacity-60
              mix-blend-darken transition-opacity
              duration-500
              [background:radial-gradient(ellipse_at_center,transparent_40%,rgb(var(--color-tech-main-dark)/0.45)_100%)] group-hover/banner:opacity-100
            "
          />

          {/* Corner brackets — expand on hover */}
          <div className="pointer-events-none absolute top-2 left-2 size-4 border-t-2 border-l-2 border-tech-main/85 mix-blend-color-burn transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:size-6 group-hover/banner:border-tech-main" />
          <div className="pointer-events-none absolute top-2 right-2 size-4 border-t-2 border-r-2 border-tech-main/85 mix-blend-color-burn transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:size-6 group-hover/banner:border-tech-main" />
          <div className="pointer-events-none absolute bottom-2 left-2 size-4 border-b-2 border-l-2 border-tech-main/85 mix-blend-color-burn transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:size-6 group-hover/banner:border-tech-main" />
          <div className="pointer-events-none absolute right-2 bottom-2 size-4 border-r-2 border-b-2 border-tech-main/85 mix-blend-color-burn transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:size-6 group-hover/banner:border-tech-main" />

          {/* Crosshair — parallax until locked, then stays centered */}
          <div
            className="pointer-events-none absolute opacity-20 mix-blend-multiply group-hover/banner:opacity-40"
            style={crosshairStyle}>
            <div className="absolute top-1/2 left-1/2 h-px w-10 -translate-1/2 bg-tech-main" />
            <div className="absolute top-1/2 left-1/2 h-10 w-px -translate-1/2 bg-tech-main" />
            <div className="size-5 rounded-full border border-tech-main" />
          </div>
        </figure>

        {/* Bottom bar — alt text as caption */}
        <div
          className="
            flex items-center gap-2 border-t border-tech-main/30
            bg-tech-main/5 px-3 py-1.5 font-mono text-[0.75rem]
            tracking-wide text-tech-main/80
          ">
          <span className="shrink-0 text-tech-main/30">{"// "}</span>
          <span className="truncate italic">{alt}</span>
        </div>
      </div>

      {/* Outer corner accents */}
      <div className="pointer-events-none absolute -top-px -left-px size-2 border-t-2 border-l-2 border-tech-main/60" />
      <div className="pointer-events-none absolute -top-px -right-px size-2 border-t-2 border-r-2 border-tech-main/60" />
      <div className="pointer-events-none absolute -bottom-px -left-px size-2 border-b-2 border-l-2 border-tech-main/60" />
      <div className="pointer-events-none absolute -right-px -bottom-px size-2 border-r-2 border-b-2 border-tech-main/60" />
    </div>
  )
}
