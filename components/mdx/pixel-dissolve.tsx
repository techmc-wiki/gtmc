"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

/**
 * Pixel dissolve canvas, adapted from ReactBits `PixelCard` (MIT).
 * Pixels bloom outward from the cursor and shimmer while hovered or
 * focused; they dissolve when the pointer leaves. GTMC-native: square
 * pixels in theme-aware signal-blue tints, disabled entirely under
 * `prefers-reduced-motion`.
 */

type PixelRig = {
  pixels: Pixel[]
  width: number
  height: number
}

class Pixel {
  x: number
  y: number
  color: string
  speed: number
  size = 0
  sizeStep = Math.random() * 0.4 + 0.1
  minSize = 0.6
  maxSize = Math.random() * 2.2 + 1.2
  delay: number
  counter = 0
  counterStep = Math.random() * 3 + 3
  isIdle = true
  isShimmer = false
  isReverse = false

  constructor(
    x: number,
    y: number,
    color: string,
    speed: number,
    delay: number
  ) {
    this.x = x
    this.y = y
    this.color = color
    this.speed = speed * (0.35 + Math.random() * 0.65)
    this.delay = delay
  }
}

const GAP = 7
const SPEED = 26

function paletteFor(theme: "light" | "dark"): string[] {
  return theme === "dark"
    ? ["#5fb0d4", "#8ec9e6", "#bfe0f0"]
    : ["#1d6a96", "#4a90bd", "#8fc3dd"]
}

export function PixelDissolve({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const rigRef = React.useRef<PixelRig>({ pixels: [], width: 0, height: 0 })
  const frameRef = React.useRef<number | null>(null)
  const lastTickRef = React.useRef(0)
  const modeRef = React.useRef<"appear" | "disappear">("disappear")
  const reducedMotionRef = React.useRef(true)

  const buildPixels = React.useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const rect = container.getBoundingClientRect()
    const width = Math.floor(rect.width)
    const height = Math.floor(rect.height)
    if (width === 0 || height === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const dark =
      document.documentElement.dataset.theme === "dark" ||
      (document.documentElement.dataset.theme === undefined &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    const colors = paletteFor(dark ? "dark" : "light")

    const pixels: Pixel[] = []
    for (let x = GAP / 2; x < width; x += GAP) {
      for (let y = GAP / 2; y < height; y += GAP) {
        const dx = x - width / 2
        const dy = y - height / 2
        pixels.push(
          new Pixel(
            x,
            y,
            colors[Math.floor(Math.random() * colors.length)],
            SPEED * 0.001,
            Math.hypot(dx, dy) * 1.6
          )
        )
      }
    }
    rigRef.current = { pixels, width, height }

    // Redraw the static frame at the current mode's resting state.
    ctx.clearRect(0, 0, width, height)
  }, [])

  const tick = React.useCallback(() => {
    frameRef.current = requestAnimationFrame(tick)
    const now = performance.now()
    if (now - lastTickRef.current < 1000 / 60) return
    lastTickRef.current = now - ((now - lastTickRef.current) % (1000 / 60))

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const { pixels, width, height } = rigRef.current
    if (!ctx || pixels.length === 0) return

    ctx.clearRect(0, 0, width, height)

    let allIdle = true
    const appearing = modeRef.current === "appear"
    for (const pixel of pixels) {
      if (appearing) {
        pixel.isIdle = false
        if (pixel.counter <= pixel.delay) {
          pixel.counter += pixel.counterStep
        } else {
          if (pixel.size >= pixel.maxSize) pixel.isShimmer = true
          if (pixel.isShimmer) {
            if (pixel.size >= pixel.maxSize) pixel.isReverse = true
            else if (pixel.size <= pixel.minSize) pixel.isReverse = false
            pixel.size += pixel.isReverse ? -pixel.speed : pixel.speed
          } else {
            pixel.size += pixel.sizeStep
          }
        }
        if (!pixel.isShimmer || pixel.size > pixel.minSize) allIdle = false
      } else {
        pixel.isShimmer = false
        pixel.counter = 0
        if (pixel.size <= 0) {
          pixel.isIdle = true
        } else {
          pixel.size -= 0.12
          allIdle = false
        }
      }

      if (pixel.size > 0) {
        const offset = 1 - pixel.size * 0.5
        ctx.fillStyle = pixel.color
        ctx.fillRect(pixel.x + offset, pixel.y + offset, pixel.size, pixel.size)
      }
    }

    if (allIdle && !appearing) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const startAnimation = React.useCallback(
    (mode: "appear" | "disappear") => {
      if (reducedMotionRef.current) return
      modeRef.current = mode
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      lastTickRef.current = 0
      frameRef.current = requestAnimationFrame(tick)
    },
    [tick]
  )

  React.useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    buildPixels()

    const observer = new ResizeObserver(buildPixels)
    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [buildPixels])

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") startAnimation("appear")
      }}
      onPointerLeave={() => startAnimation("disappear")}
      onFocus={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          startAnimation("appear")
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          startAnimation("disappear")
        }
      }}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none"
        style={{ position: "absolute", inset: 0 }}
      />
      {children}
    </div>
  )
}
