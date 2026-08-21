"use client"

import { useCallback, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"

const TILT_MAX_DEG = 4
// Exponential smoothing factor per 60fps frame; lower = softer, lagged follow.
const TILT_SMOOTHING = 0.1

export function HeroCard() {
  const t = useTranslations("Homepage")
  const tiltRef = useRef<HTMLDivElement>(null)

  const tiltStateRef = useRef({
    rx: 0,
    ry: 0,
    targetRx: 0,
    targetRy: 0,
    last: 0,
  })
  const coverRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  const step = useCallback((now: number) => {
    const el = tiltRef.current
    const s = tiltStateRef.current
    if (!el) {
      rafRef.current = null
      return
    }
    // Frame-rate-independent easing: matches TILT_SMOOTHING per 60fps frame.
    const dt = Math.min(now - s.last, 100)
    s.last = now
    const ease = 1 - Math.pow(1 - TILT_SMOOTHING, dt / 16.67)
    s.rx += (s.targetRx - s.rx) * ease
    s.ry += (s.targetRy - s.ry) * ease
    el.style.transform = `perspective(1000px) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`
    // Directional cast shadow: shifts toward the dipped side and softens with lift.
    const cover = coverRef.current
    if (cover) {
      const nx = s.ry / TILT_MAX_DEG
      const ny = s.rx / TILT_MAX_DEG
      const mag = Math.hypot(nx, ny) / Math.SQRT2
      const sx = (-nx * 6).toFixed(1)
      const sy = (8 + ny * 4).toFixed(1)
      const blur = Math.round(24 + mag * 14)
      const alpha = (0.16 + mag * 0.06).toFixed(2)
      cover.style.boxShadow = `${sx}px ${sy}px ${blur}px -6px rgba(32, 40, 60, ${alpha})`
    }
    if (
      Math.abs(s.targetRx - s.rx) < 0.01 &&
      Math.abs(s.targetRy - s.ry) < 0.01
    ) {
      // Settled: snap to target and idle until the next pointer event.
      s.rx = s.targetRx
      s.ry = s.targetRy
      rafRef.current = null
      return
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  const startTiltLoop = useCallback(() => {
    if (rafRef.current === null) {
      tiltStateRef.current.last = performance.now()
      rafRef.current = requestAnimationFrame(step)
    }
  }, [step])

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        event.pointerType !== "mouse" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return
      }
      const el = tiltRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const halfWidth = rect.width / 2
      const halfHeight = rect.height / 2
      const rotateY =
        ((event.clientX - rect.left - halfWidth) / halfWidth) * TILT_MAX_DEG
      const rotateX =
        -((event.clientY - rect.top - halfHeight) / halfHeight) * TILT_MAX_DEG
      tiltStateRef.current.targetRx = rotateX
      tiltStateRef.current.targetRy = rotateY
      startTiltLoop()
    },
    [startTiltLoop]
  )

  const onPointerLeave = useCallback(() => {
    tiltStateRef.current.targetRx = 0
    tiltStateRef.current.targetRy = 0
    startTiltLoop()
  }, [startTiltLoop])

  return (
    <div className="group animate-tech-pop-in fill-mode-forwards relative mb-8 w-full max-w-sm opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] motion-reduce:animate-none motion-reduce:opacity-100 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
      <div
        ref={tiltRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="relative will-change-transform">
        {/* 书籍封面：Springer GTM 风格 */}
        <div
          ref={coverRef}
          className="border-tech-main-dark/80 bg-surface relative overflow-hidden border shadow-[0_8px_24px_-6px_rgba(32,40,60,0.16)]">
          {/* 顶部书带 */}
          <div className="bg-tech-signal text-tech-signal-ink relative flex items-center justify-between px-6 py-3 sm:px-10 sm:py-4">
            <span className="animate-fade-in fill-mode-forwards font-mono text-[0.625rem] font-bold tracking-[0.25em] uppercase opacity-0 [animation-delay:0.6s] motion-reduce:animate-none motion-reduce:opacity-100 sm:text-xs">
              Open Access
            </span>
            <span className="animate-fade-in fill-mode-forwards hidden font-mono text-[0.625rem] font-bold opacity-0 [animation-delay:0.8s] motion-reduce:animate-none motion-reduce:opacity-100 sm:block sm:text-xs">
              {process.env.NEXT_PUBLIC_APP_VERSION}
            </span>
          </div>

          <div className="relative p-6 sm:p-10 md:p-12">
            <h1 className="text-tech-main-dark relative mb-6 flex flex-col items-start text-4xl tracking-tight sm:mb-8 sm:gap-1 sm:text-6xl lg:text-7xl">
              <span className="animate-tech-slide-in display-title fill-mode-forwards opacity-0 [animation-delay:0.5s] motion-reduce:animate-none motion-reduce:opacity-100">
                Graduate Texts
              </span>
              <span className="animate-tech-slide-in display-title text-tech-main fill-mode-forwards flex flex-row items-baseline gap-3 opacity-0 [animation-delay:0.7s] motion-reduce:animate-none motion-reduce:opacity-100 sm:gap-5">
                in Minecraft
                <span
                  aria-hidden="true"
                  className="bg-tech-signal fill-mode-forwards inline-block h-[0.7em] w-[0.45ch] animate-pulse self-center opacity-0 [animation-delay:0.9s] motion-reduce:animate-none motion-reduce:opacity-100"
                />
              </span>
            </h1>

            <div className="animate-fade-in border-tech-signal fill-mode-forwards flex max-w-xl flex-col gap-2 border-l-[3px] pl-3 opacity-0 [animation-delay:1.2s] [animation-duration:1s] motion-reduce:animate-none motion-reduce:opacity-100 sm:gap-4 sm:pl-5">
              <span className="text-tech-main-dark/85 text-xs/relaxed sm:text-base/relaxed">
                {t("slogan")}
              </span>

              <span className="text-tech-main font-mono text-[0.5625rem] tracking-wider sm:text-xs">
                <span className="sm:hidden">
                  -&gt; TUTORIALS
                  <br />
                  -&gt; EXPLANATIONS
                  <br />
                  -&gt; CODE ANALYSIS
                </span>
                <span className="hidden sm:inline">
                  &gt;&gt; TUTORIALS&ensp;|&ensp;EXPLANATIONS&ensp;|&ensp;CODE
                  ANALYSIS
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
