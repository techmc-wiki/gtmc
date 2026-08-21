"use client"

import { useCallback, useRef } from "react"
import { useTranslations } from "next-intl"

const TILT_MAX_DEG = 4

export function HeroCard() {
  const t = useTranslations("Homepage")
  const tiltRef = useRef<HTMLDivElement>(null)

  const applyTilt = useCallback((rx: number, ry: number) => {
    const el = tiltRef.current
    if (!el) return
    el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
  }, [])

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
      applyTilt(rotateX, rotateY)
    },
    [applyTilt]
  )

  const onPointerLeave = useCallback(() => {
    applyTilt(0, 0)
  }, [applyTilt])

  return (
    <div className="group animate-tech-pop-in fill-mode-forwards relative mb-8 w-full max-w-sm opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] motion-reduce:animate-none motion-reduce:opacity-100 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
      <div
        ref={tiltRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="relative transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform">
        {/* 书脊投影：模拟实体书叠放的错位 */}
        <div className="bg-tech-main-dark/15 absolute inset-0 -z-10 translate-2 transition-transform duration-500 ease-out group-hover:translate-3" />

        {/* 书籍封面：Springer GTM 风格 */}
        <div className="border-tech-main-dark/80 bg-surface relative overflow-hidden border shadow-sm">
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
