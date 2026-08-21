"use client"
// Vendored from ReactBits (reactbits.dev/r/DotGrid-TS-TW), then adapted for GTMC:
// - respects prefers-reduced-motion (single static frame, no listeners)
// - rAF loop sleeps when the pointer is idle/away and when off-screen
// - devicePixelRatio capped at 2
// - global click-shock removed (restraint over spectacle)
import React, { useRef, useEffect, useCallback, useMemo } from "react"
import { gsap } from "gsap"
import { InertiaPlugin } from "gsap/InertiaPlugin"

import { cn } from "@/lib/cn"

gsap.registerPlugin(InertiaPlugin)

const throttle = (func: (event: MouseEvent) => void, limit: number) => {
  let lastCall = 0
  return (event: MouseEvent) => {
    const now = performance.now()
    if (now - lastCall >= limit) {
      lastCall = now
      func(event)
    }
  }
}

interface Dot {
  cx: number
  cy: number
  xOffset: number
  yOffset: number
  _inertiaApplied: boolean
}

export interface DotGridProps {
  dotSize?: number
  gap?: number
  baseColor?: string
  activeColor?: string
  proximity?: number
  speedTrigger?: number
  maxSpeed?: number
  resistance?: number
  returnDuration?: number
  className?: string
  style?: React.CSSProperties
}

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  }
}

const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 16,
  gap = 32,
  baseColor = "#5227FF",
  activeColor = "#5227FF",
  proximity = 150,
  speedTrigger = 100,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  className = "",
  style,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const pointerRef = useRef({
    x: -10000,
    y: -10000,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0,
  })

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor])
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor])

  const circlePath = useMemo(() => {
    if (typeof window === "undefined" || !window.Path2D) return null

    const p = new Path2D()
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2)
    return p
  }, [dotSize])

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const { width, height } = wrap.getBoundingClientRect()
    if (width === 0 || height === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const cols = Math.floor((width + gap) / (dotSize + gap))
    const rows = Math.floor((height + gap) / (dotSize + gap))
    const cell = dotSize + gap

    const gridW = cell * cols - gap
    const gridH = cell * rows - gap

    const extraX = width - gridW
    const extraY = height - gridH

    const startX = extraX / 2 + dotSize / 2
    const startY = extraY / 2 + dotSize / 2

    const dots: Dot[] = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell
        const cy = startY + y * cell
        dots.push({ cx, cy, xOffset: 0, yOffset: 0, _inertiaApplied: false })
      }
    }
    dotsRef.current = dots
  }, [dotSize, gap])

  useEffect(() => {
    const wrap = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas || !circlePath) return

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId = 0
    let running = false
    let inView = true
    let lastActivity = performance.now()

    const drawFrame = () => {
      const { width, height } = wrap.getBoundingClientRect()
      ctx.clearRect(0, 0, width, height)

      const { x: px, y: py } = pointerRef.current
      const proxSq = proximity * proximity

      for (const dot of dotsRef.current) {
        const ox = dot.cx + dot.xOffset
        const oy = dot.cy + dot.yOffset
        const dx = dot.cx - px
        const dy = dot.cy - py
        const dsq = dx * dx + dy * dy

        let fill = baseColor
        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq)
          const t = 1 - dist / proximity
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t)
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t)
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t)
          fill = `rgb(${r},${g},${b})`
        }

        ctx.save()
        ctx.translate(ox, oy)
        ctx.fillStyle = fill
        ctx.fill(circlePath)
        ctx.restore()
      }
    }

    const hasSettledDots = () =>
      dotsRef.current.some(
        (dot) => dot.xOffset !== 0 || dot.yOffset !== 0 || dot._inertiaApplied
      )

    const tick = () => {
      drawFrame()
      const idleFor = performance.now() - lastActivity
      if (!inView || (idleFor > 400 && !hasSettledDots())) {
        running = false
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    const wake = () => {
      if (running || reducedQuery.matches || !inView) return
      running = true
      lastActivity = performance.now()
      rafId = requestAnimationFrame(tick)
    }

    // Static frame for reduced motion: plain grid, no listeners, no loop.
    const renderStatic = () => {
      pointerRef.current.x = -10000
      pointerRef.current.y = -10000
      drawFrame()
    }

    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      const pr = pointerRef.current
      const dt = pr.lastTime ? now - pr.lastTime : 16
      const dx = e.clientX - pr.lastX
      const dy = e.clientY - pr.lastY
      let vx = (dx / dt) * 1000
      let vy = (dy / dt) * 1000
      let speed = Math.hypot(vx, vy)
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed
        vx *= scale
        vy *= scale
        speed = maxSpeed
      }
      pr.lastTime = now
      pr.lastX = e.clientX
      pr.lastY = e.clientY
      pr.vx = vx
      pr.vy = vy
      pr.speed = speed

      const rect = canvas.getBoundingClientRect()
      pr.x = e.clientX - rect.left
      pr.y = e.clientY - rect.top

      lastActivity = now

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y)
        if (speed > speedTrigger && dist < proximity && !dot._inertiaApplied) {
          dot._inertiaApplied = true
          gsap.killTweensOf(dot)
          const pushX = dot.cx - pr.x + vx * 0.005
          const pushY = dot.cy - pr.y + vy * 0.005
          gsap.to(dot, {
            inertia: { xOffset: pushX, yOffset: pushY, resistance },
            onComplete: () => {
              gsap.to(dot, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration,
                ease: "elastic.out(1,0.75)",
              })
              dot._inertiaApplied = false
            },
          })
        }
      }

      wake()
    }

    const throttledMove = throttle(onMove, 50)

    const onLeave = () => {
      pointerRef.current.x = -10000
      pointerRef.current.y = -10000
      lastActivity = performance.now()
      wake()
    }

    const onMotionChange = () => {
      if (reducedQuery.matches) {
        gsap.killTweensOf(dotsRef.current)
        for (const dot of dotsRef.current) {
          dot.xOffset = 0
          dot.yOffset = 0
          dot._inertiaApplied = false
        }
        if (running) {
          running = false
          cancelAnimationFrame(rafId)
        }
        renderStatic()
      } else {
        wake()
      }
    }

    const observer = new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1]?.isIntersecting ?? true
      if (!inView && running) {
        running = false
        cancelAnimationFrame(rafId)
      } else if (inView) {
        wake()
      }
    })
    observer.observe(wrap)

    buildGrid()
    renderStatic()

    if (!reducedQuery.matches) {
      window.addEventListener("mousemove", throttledMove, { passive: true })
      document.documentElement.addEventListener("mouseleave", onLeave)
    }
    reducedQuery.addEventListener("change", onMotionChange)

    const resize = () => {
      buildGrid()
      if (reducedQuery.matches) renderStatic()
      else wake()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrap)

    return () => {
      running = false
      cancelAnimationFrame(rafId)
      observer.disconnect()
      resizeObserver.disconnect()
      if (!reducedQuery.matches) {
        window.removeEventListener("mousemove", throttledMove)
        document.documentElement.removeEventListener("mouseleave", onLeave)
      }
      reducedQuery.removeEventListener("change", onMotionChange)
      gsap.killTweensOf(dotsRef.current)
    }
  }, [
    buildGrid,
    circlePath,
    proximity,
    speedTrigger,
    maxSpeed,
    resistance,
    returnDuration,
    baseColor,
    baseRgb,
    activeRgb,
  ])

  return (
    <section
      aria-hidden="true"
      className={cn("pointer-events-none relative h-full w-full", className)}
      style={style}>
      <div ref={wrapperRef} className="relative h-full w-full">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
    </section>
  )
}

export default DotGrid
