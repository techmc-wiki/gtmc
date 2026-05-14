"use client"

import { motion, MotionValue } from "motion/react"
import { ForwardedRef } from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"

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
  return (
    <motion.div
      ref={cardRef}
      className="group animate-tech-pop-in homepage-decor-foreground fill-mode-forwards relative mb-8 w-full max-w-sm opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] sm:max-w-xl md:max-w-2xl lg:max-w-4xl"
      style={{
        x: fgTransform.x,
        y: fgTransform.y,
        rotateX: fgTransform.rotateX,
        rotateY: fgTransform.rotateY,
        transformStyle: "preserve-3d",
      }}>
      {/* 下层错位阴影框 */}
      <div className="guide-line absolute inset-0 -z-10 translate-3 border bg-transparent transition-transform duration-500 ease-out group-hover:translate-4" />

      {/* 尺寸标注装饰 */}
      <div className="animate-fade-in fill-mode-forwards absolute -top-6 left-0 flex w-full items-center font-mono text-[0.625rem] opacity-0 [animation-delay:1.5s]">
        <span>|&lt;</span>
        <span className="border-tech-main/30 mx-2 grow border-t"></span>
        <span>{cardWidth}px</span>
        <span className="border-tech-main/30 mx-2 grow border-t"></span>
        <span>&gt;|</span>
      </div>

      <div className="border-tech-main/40 relative overflow-hidden border bg-white/60 p-6 shadow-sm backdrop-blur-md sm:p-10 md:p-14">
        {/* 闪光扫过效果 */}
        <div className="pointer-events-none absolute inset-0 translate-x-[-200%] -skew-x-12 animate-[shimmer_3s_infinite_2s] bg-linear-to-r from-transparent via-white/40 to-transparent" />

        {/* 工业感/图纸感的定位刻度 */}
        <CornerBrackets
          size="size-3"
          color="border-tech-main"
          corners="top-bottom"
        />

        {/* 钉子/打孔装饰 */}
        <div className="border-tech-main/50 bg-tech-bg/50 absolute top-4 right-4 size-1.5 rounded-full border" />
        <div className="border-tech-main/50 bg-tech-bg/50 absolute bottom-4 left-4 size-1.5 rounded-full border" />

        <div className="animate-fade-in fill-mode-forwards mb-6 flex items-center space-x-4 opacity-0 [animation-delay:0.8s]">
          <div className="border-tech-main/40 bg-tech-main/5 relative flex size-4 items-center justify-center border transition-transform duration-500 group-hover:rotate-90 sm:size-6">
            <div className="bg-tech-main/30 group-hover:bg-tech-main/60 size-1.5 transition-colors sm:size-2" />
          </div>
          <h2 className="text-tech-main/80 font-mono text-[0.5rem] tracking-[0.3em] uppercase sm:text-xs">
            Knowledge Base_
          </h2>
        </div>

        <h1 className="text-tech-main-dark relative mb-6 flex flex-col items-start gap-0 text-4xl font-bold tracking-tight sm:gap-2 sm:text-6xl lg:text-7xl">
          <span className="animate-tech-slide-in text-tech-main-dark fill-mode-forwards font-light opacity-0 [animation-delay:0.5s]">
            Graduate Texts
          </span>
          <div className="flex flex-row">
            <span className="animate-tech-slide-in text-tech-main fill-mode-forwards pl-[0.08ch] font-semibold opacity-0 mix-blend-multiply [animation-delay:0.7s]">
              in Minecraft
            </span>
            <span className="bg-tech-main fill-mode-forwards ml-4 inline-block h-[0.85em] w-[0.5ch] animate-pulse self-center opacity-0 [animation-delay:0.9s] sm:ml-6" />
          </div>
        </h1>

        <div className="animate-fade-in border-tech-main/40 fill-mode-forwards ml-1 flex max-w-xl flex-col gap-1.5 border-l-[3px] pl-3 opacity-0 [animation-delay:1.2s] [animation-duration:1s] [animation-translate-y:20px] sm:ml-1.5 sm:gap-4 sm:pl-5">
          <span className="text-tech-main-dark/80 text-xs/normal sm:text-base">
            社区驱动的 Minecraft 红石和技术在线教科书。
            <br className="sm:hidden" />
            提供入门教程、机制阐述和源码阅读，助你在方块世界中攻克学术难题。
          </span>

          <span className="flex flex-row items-center gap-2 sm:gap-4">
            <span className="bg-tech-main hidden min-h-1.5 min-w-1.5 animate-pulse rounded-full sm:block sm:min-h-2 sm:min-w-2" />
            <span className="font-mono text-[0.5rem] opacity-60 sm:text-[0.75rem]">
              <span className="sm:hidden">
                -&gt; TUTORIALS
                <br />
                -&gt; EXPLANATIONS
                <br />
                -&gt; CODE ANALYSIS
              </span>
              <span className="hidden sm:inline">
                &gt;&gt; TUTORIALS | EXPLANATIONS | CODE ANALYSIS
              </span>
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  )
}
