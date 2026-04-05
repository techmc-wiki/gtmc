"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

interface ArticleBannerProps {
  src: string
  alt: string
}

const PARALLAX_STRENGTH = 3
const IMG_PARALLAX_STRENGTH = 8

export function ArticleBanner({ src, alt }: ArticleBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [locked, setLocked] = useState(false)
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (locked) return
      const rect = bannerRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (window.innerWidth / 2)
      const dy = (e.clientY - cy) / (window.innerHeight / 2)
      setOffset({ x: dx, y: dy })
    }
    window.addEventListener("mousemove", onMouseMove)
    return () => window.removeEventListener("mousemove", onMouseMove)
  }, [locked])

  function handleFirstHover() {
    if (locked) return
    setLocked(true)
    setFlashing(true)
    setTimeout(() => setFlashing(false), 400)
  }

  const crosshairX = locked
    ? 50
    : hovered
      ? 50
      : 50 + offset.x * PARALLAX_STRENGTH
  const crosshairY = locked
    ? 50
    : hovered
      ? 50
      : 50 + offset.y * PARALLAX_STRENGTH
  const imgX = locked ? 0 : hovered ? 0 : -offset.x * IMG_PARALLAX_STRENGTH
  const imgY = locked ? 0 : hovered ? 0 : -offset.y * IMG_PARALLAX_STRENGTH

  return (
    <div
      ref={bannerRef}
      className="
        group/banner relative mb-8 animate-fade-in
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:-translate-y-1.5
        hover:shadow-[0_16px_40px_rgba(74,90,120,0.16),0_4px_12px_rgba(74,90,120,0.10)]
      ">
      {/* Depth frame layers — expand outward on hover */}
      <div className="pointer-events-none absolute inset-0 border border-tech-main/15 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:-inset-2" />
      <div className="pointer-events-none absolute inset-0 border border-tech-main/8 transition-all delay-30 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:-inset-4" />

      {/* Outer frame */}
      <div className="relative border border-tech-main/40 bg-white/60">
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
        <div
          ref={imgRef}
          role="img"
          aria-label={alt}
          className="relative aspect-21/9 w-full overflow-hidden"
          onMouseEnter={() => {
            setHovered(true)
            handleFirstHover()
          }}
          onMouseLeave={() => setHovered(false)}>
          {/* Shutter flash overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-20 bg-black"
            style={{
              opacity: flashing ? 0.3 : 0,
              transition: flashing
                ? "opacity 120ms ease-in"
                : "opacity 80ms ease-out",
            }}
          />

          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
            className="object-cover"
            style={{
              transform: `translate(${imgX}px, ${imgY}px) scale(${hovered ? 1.1 : locked ? 1 : 1.06})`,
              filter: locked
                ? "blur(0px) saturate(1)"
                : "blur(1.5px) saturate(0.88)",
              transition: locked
                ? "transform 600ms cubic-bezier(0.16,1,0.3,1), filter 500ms ease-out"
                : hovered
                  ? "transform 600ms cubic-bezier(0.16,1,0.3,1), filter 700ms cubic-bezier(0.16,1,0.3,1)"
                  : "transform 200ms linear, filter 700ms cubic-bezier(0.16,1,0.3,1)",
            }}
            priority
          />

          {/* Blueprint grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-multiply transition-transform duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:scale-105"
            style={{
              backgroundImage: `
                linear-gradient(to right, #60708f 1px, transparent 1px),
                linear-gradient(to bottom, #60708f 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Vignette — deepens on hover */}
          <div
            className="
              pointer-events-none absolute inset-0 z-10 opacity-60
              mix-blend-darken transition-opacity
              duration-500
              [background:radial-gradient(ellipse_at_center,transparent_40%,rgba(74,90,120,0.45)_100%)] group-hover/banner:opacity-100
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
            style={{
              left: `${crosshairX}%`,
              top: `${crosshairY}%`,
              transform: "translate(-50%, -50%)",
              transition:
                locked || hovered
                  ? "left 600ms cubic-bezier(0.16,1,0.3,1), top 600ms cubic-bezier(0.16,1,0.3,1)"
                  : "none",
            }}>
            <div className="absolute top-1/2 left-1/2 h-px w-10 -translate-1/2 bg-tech-main" />
            <div className="absolute top-1/2 left-1/2 h-10 w-px -translate-1/2 bg-tech-main" />
            <div className="size-5 rounded-full border border-tech-main" />
          </div>
        </div>

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
