"use client"

import { motion, MotionValue } from "motion/react"
import { ForwardedRef } from "react"

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
      className="
        group relative mb-8 w-full max-w-3xl animate-tech-pop-in opacity-0
        homepage-decor-foreground [animation-delay:0.2s]
        [animation-duration:0.8s] fill-mode-forwards
      "
      style={{
        x: fgTransform.x,
        y: fgTransform.y,
        rotateX: fgTransform.rotateX,
        rotateY: fgTransform.rotateY,
        transformStyle: "preserve-3d",
      }}>
      {/* 下层错位阴影框 */}
      <div
        className="
          absolute inset-0 -z-10 translate-3 border guide-line
          bg-transparent transition-transform duration-500 ease-out
          group-hover:translate-4
        "
      />

      {/* 尺寸标注装饰 */}
      <div
        className="
          absolute -top-6 left-0 flex w-full animate-fade-in items-center
          font-mono text-[10px] opacity-0 [animation-delay:1.5s]
          fill-mode-forwards
        ">
        <span>|&lt;</span>
        <span className="mx-2 grow border-t border-tech-main/30"></span>
        <span>{cardWidth}px</span>
        <span className="mx-2 grow border-t border-tech-main/30"></span>
        <span>&gt;|</span>
      </div>

      <div
        className="
          relative overflow-hidden border border-tech-main/40 bg-white/60
          p-6 shadow-sm backdrop-blur-md
          sm:p-10
          md:p-14
        ">
        {/* 闪光扫过效果 */}
        <div
          className="
            pointer-events-none absolute inset-0 translate-x-[-200%]
            -skew-x-12 animate-[shimmer_3s_infinite_2s] bg-linear-to-r
            from-transparent via-white/40 to-transparent
          "
        />

        {/* 工业感/图纸感的定位刻度 */}
        <div
          className="
            absolute top-0 left-0 size-3 -translate-0.5 border-t-2
            border-l-2 border-tech-main
          "
        />
        <div
          className="
            absolute right-0 bottom-0 size-3 translate-0.5 border-r-2
            border-b-2 border-tech-main
          "
        />

        {/* 钉子/打孔装饰 */}
        <div
          className="
            absolute top-4 right-4 size-1.5 rounded-full border
            border-tech-main/50 bg-tech-bg/50
          "
        />
        <div
          className="
            absolute bottom-4 left-4 size-1.5 rounded-full border
            border-tech-main/50 bg-tech-bg/50
          "
        />

        <div
          className="
            mb-6 flex animate-fade-in items-center space-x-4 opacity-0
            [animation-delay:0.8s] fill-mode-forwards
          ">
          <div
            className="
              relative flex size-10 items-center justify-center border
              border-tech-main/40 bg-tech-main/5 transition-transform
              duration-500
              group-hover:rotate-90
            ">
            <div
              className="
                size-4 bg-tech-main/30 transition-colors
                group-hover:bg-tech-main/60
              "
            />
          </div>
          <h2
            className="
              font-mono text-sm tracking-[0.3em] text-tech-main/80 uppercase
            ">
            Knowledge Base_
          </h2>
        </div>

        <h1
          className="
            relative mb-6 flex flex-col items-start gap-2 text-3xl font-bold
            tracking-tight text-tech-main-dark
            sm:text-3xl
            md:text-5xl
            lg:text-6xl
          ">
          <span
            className="
              mr-6 -ml-0.5 inline-block animate-tech-slide-in font-light
              text-tech-main-dark opacity-0 [animation-delay:0.5s]
              fill-mode-forwards
            ">
            Gradutate Texts in
          </span>
          <div className="flex flex-row">
            <span
              className="
                inline-block animate-tech-slide-in font-bold text-tech-main
                opacity-0 mix-blend-multiply [animation-delay:0.7s]
                fill-mode-forwards
              ">
              Technical Minecraft
            </span>
            <span
              className="
                ml-4 inline-block h-[1em] w-6 animate-pulse bg-tech-main
                align-middle opacity-0 [animation-delay:1s]
                fill-mode-forwards
              "
            />
          </div>
        </h1>

        <div
          className="
            ml-2 max-w-xl animate-fade-in border-l-[3px] border-tech-main/40
            pl-5 text-base/relaxed tracking-wide text-tech-main-dark/80
            opacity-0 [animation-delay:1.2s] [animation-duration:1s]
            [animation-translate-y:20px] fill-mode-forwards
          ">
          支持多人协作、内容审核与 Git 自动备份的 MC 资源与知识整合站点。
          <span
            className="
              mt-2 flex items-center font-mono text-[11px]
              tracking-tech-wide opacity-60
            ">
            <span
              className="
                mr-3 ml-0.5 size-2 animate-pulse rounded-full bg-tech-main
              "
            />
            &gt;&gt; MODPACKS | MECHANICS | TUTORIALS
          </span>
        </div>
      </div>
    </motion.div>
  )
}
