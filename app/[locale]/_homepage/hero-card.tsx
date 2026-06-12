"use client"

import type { MotionValue } from "motion/react"
import { motion } from "motion/react"
import type { ForwardedRef } from "react"
import { useMemo } from "react"

export function HeroCard({
  cardRef,
  cardWidth,
  fgTransform,
}: {
  cardRef: ForwardedRef<HTMLDivElement>
  cardWidth: number
  fgTransform: {
    x: MotionValue<number>
    y: MotionValue<number>
    rotateX: MotionValue<number>
    rotateY: MotionValue<number>
  }
}) {
  const cardStyle = useMemo(
    () => ({
      x: fgTransform.x,
      y: fgTransform.y,
      rotateX: fgTransform.rotateX,
      rotateY: fgTransform.rotateY,
      transformStyle: "preserve-3d" as const,
    }),
    [fgTransform.x, fgTransform.y, fgTransform.rotateX, fgTransform.rotateY]
  )

  return (
    <motion.div
      ref={cardRef}
      className="group animate-tech-pop-in homepage-decor-foreground fill-mode-forwards relative mb-8 w-full max-w-sm opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] motion-reduce:animate-none motion-reduce:opacity-100 sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
      style={cardStyle}>
      {/* 书脊投影：模拟实体书叠放的错位 */}
      <div className="bg-tech-main-dark/15 absolute inset-0 -z-10 translate-2 transition-transform duration-500 ease-out group-hover:translate-3" />

      {/* 尺寸标注装饰 */}
      <div className="animate-fade-in fill-mode-forwards absolute -top-6 left-0 flex w-full items-center font-mono text-[0.625rem] opacity-0 [animation-delay:1.5s] motion-reduce:animate-none motion-reduce:opacity-100">
        <span>|&lt;</span>
        <span className="border-tech-main/30 mx-2 grow border-t"></span>
        <span>{cardWidth}px</span>
        <span className="border-tech-main/30 mx-2 grow border-t"></span>
        <span>&gt;|</span>
      </div>

      {/* 书籍封面：Springer GTM 风格 */}
      <div className="border-tech-main-dark/80 bg-surface relative overflow-hidden border shadow-sm">
        <div className="card-shimmer" />

        {/* 顶部黄色书带 */}
        <div className="bg-tech-signal text-tech-signal-ink relative flex items-center justify-between px-6 py-3 sm:px-10 sm:py-4">
          <span className="animate-fade-in fill-mode-forwards font-mono text-[0.625rem] font-bold tracking-[0.25em] uppercase opacity-0 [animation-delay:0.6s] motion-reduce:animate-none motion-reduce:opacity-100 sm:text-xs">
            Graduate Texts in Minecraft
          </span>
          <span className="animate-fade-in fill-mode-forwards hidden font-mono text-[0.625rem] font-bold opacity-0 [animation-delay:0.8s] motion-reduce:animate-none motion-reduce:opacity-100 sm:block sm:text-xs">
            VOL.01
          </span>
        </div>

        <div className="relative p-6 sm:p-10 md:p-12">
          <h1 className="text-tech-main-dark relative mb-6 flex flex-col items-start text-4xl tracking-tight sm:mb-8 sm:gap-1 sm:text-6xl lg:text-7xl">
            <span className="animate-tech-slide-in display-title fill-mode-forwards opacity-0 [animation-delay:0.5s] motion-reduce:animate-none motion-reduce:opacity-100">
              Technical
            </span>
            <div className="flex flex-row items-baseline">
              <span className="animate-tech-slide-in display-title text-tech-main fill-mode-forwards opacity-0 [animation-delay:0.7s] motion-reduce:animate-none motion-reduce:opacity-100">
                Minecraft
              </span>
              <span className="bg-tech-signal fill-mode-forwards ml-3 inline-block h-[0.7em] w-[0.45ch] animate-pulse self-center opacity-0 [animation-delay:0.9s] motion-reduce:animate-none motion-reduce:opacity-100 sm:ml-5" />
            </div>
          </h1>

          <div className="animate-fade-in border-tech-signal fill-mode-forwards flex max-w-xl flex-col gap-2 border-l-[3px] pl-3 opacity-0 [animation-delay:1.2s] [animation-duration:1s] motion-reduce:animate-none motion-reduce:opacity-100 sm:gap-4 sm:pl-5">
            <span className="text-tech-main-dark/85 text-xs/relaxed sm:text-base/relaxed">
              社区驱动的 Minecraft 红石和技术在线教科书。
              <br className="sm:hidden" />
              提供入门教程、机制阐述和源码阅读，助你在方块世界中攻克学术难题。
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

          {/* 封底出版信息行 */}
          <div className="border-tech-main/20 text-tech-main/50 animate-fade-in fill-mode-forwards mt-8 flex items-center justify-between border-t pt-3 font-mono text-[0.5625rem] tracking-[0.18em] uppercase opacity-0 [animation-delay:1.6s] motion-reduce:animate-none motion-reduce:opacity-100 sm:mt-10 sm:text-[0.625rem]">
            <span>GTMC PRESS</span>
            <span className="hidden sm:inline">EST. 2024</span>
            <span>OPEN EDITION</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
