"use client"

import Link from "next/link"
import { useRef, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BrutalButton } from "@/components/ui/brutal-button"
import { Logo } from "@/components/ui/logo"
import { useHomepageMotion } from "@/lib/motion/use-homepage-motion"
import { HOMEPAGE_MOTION } from "@/lib/motion/homepage-constants"
import { motion, useTransform, MotionValue } from "motion/react"

const HEX_VALUES = [
  "a1b2",
  "c3d4",
  "e5f6",
  "7890",
  "1234",
  "5678",
  "9abc",
  "def0",
  "1357",
  "2468",
  "abcd",
  "ef01",
  "2345",
  "6789",
  "bcde",
  "f012",
  "3456",
  "7890",
  "cdef",
  "0123",
  "4567",
  "89ab",
  "cdef",
  "0123",
]

function DecorElement({
  children,
  className,
  smoothMouseX,
  smoothMouseY,
  blurMax,
}: {
  children: React.ReactNode
  className?: string
  smoothMouseX: MotionValue<number>
  smoothMouseY: MotionValue<number>
  blurMax: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const getCenter = useCallback(() => {
    if (!ref.current) return { cx: 0, cy: 0 }
    const rect = ref.current.getBoundingClientRect()
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    }
  }, [])

  const filter = useTransform(
    [smoothMouseX, smoothMouseY],
    ([mx, my]: number[]) => {
      const { cx, cy } = getCenter()
      const dx = mx - cx
      const dy = my - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const t = Math.min(1, dist / HOMEPAGE_MOTION.blurRadius)
      return `blur(${t * blurMax}px)`
    }
  )

  return (
    <motion.div ref={ref} className={className} style={{ filter }}>
      {children}
    </motion.div>
  )
}

export default function Home() {
  const router = useRouter()
  const motionDriver = useHomepageMotion()
  const [isAccessingDatabase, setIsAccessingDatabase] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }

    router.prefetch("/articles")
  }, [router])

  const {
    background: bgTransform,
    midground: mgTransform,
    foreground: fgTransform,
    smoothMouseX,
    smoothMouseY,
    isReducedMotion,
  } = motionDriver

  const bgBlurMax = isReducedMotion ? 0 : HOMEPAGE_MOTION.blurMax.background
  const mgBlurMax = isReducedMotion ? 0 : HOMEPAGE_MOTION.blurMax.midground

  return (
    <div
      className="
        relative flex h-screen w-full overflow-hidden font-sans text-tech-main
        selection:bg-tech-main/20 selection:text-tech-main-dark
      ">
      {/* Background Layer - Furthest depth, slowest motion */}
      <motion.div
        className="absolute inset-0 z-0 homepage-decor-background"
        style={{ x: bgTransform.x, y: bgTransform.y }}>
        {/* 巨型背景水印 */}
        <DecorElement
          className="
            pointer-events-none absolute top-1/3 -right-20 decor-desktop-only
            hidden rotate-90 text-[10rem] font-black tracking-tighter
            whitespace-nowrap text-tech-main opacity-[0.05] mix-blend-multiply
            select-none
            lg:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          SCHEMATIC_01
        </DecorElement>

        {/* NBT二进制/Hex Dump 背景层 */}
        <DecorElement
          className="
            pointer-events-none absolute top-[20%] left-[5%] decor-desktop-only
            hidden font-mono text-[10px] leading-tight whitespace-pre
            text-tech-main opacity-[0.25] mix-blend-multiply select-none
            xl:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          00000000: 1f8b 0800 0000 0000 0000 edc1 0b00 0000 .......4........
          {"\n"}
          00000010: 0010 0700 1101 0005 6c65 7665 6c00 0800 ........level...
          {"\n"}
          00000020: 0b44 6174 6101 0006 7261 6e64 6f6d 5365 .Data...randomSe
          {"\n"}
          00000030: 6564 0000 0000 3b9a ca00 0400 0c62 6c6f ed....;......blo
          {"\n"}
          00000040: 636b 5f6c 6967 6874 5f64 6174 610a 0000 ck_light_data...
          {"\n"}
        </DecorElement>

        {/* MC 方块视角的几何线条叠加 */}
        <DecorElement
          className="
            pointer-events-none absolute right-[10%] bottom-[20%]
            decor-desktop-only hidden opacity-20
            lg:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <svg
            width="200"
            height="200"
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5">
            <polygon points="60,10 110,38 110,95 60,123 10,95 10,38" />
            <line x1="60" y1="67" x2="60" y2="123" />
            <line x1="60" y1="67" x2="10" y2="38" />
            <line x1="60" y1="67" x2="110" y2="38" />
            <line
              x1="60"
              y1="10"
              x2="60"
              y2="67"
              strokeDasharray="2 2"
              className="opacity-50"
            />
            <line
              x1="10"
              y1="95"
              x2="60"
              y2="67"
              strokeDasharray="2 2"
              className="opacity-50"
            />
            <line
              x1="110"
              y1="95"
              x2="60"
              y2="67"
              strokeDasharray="2 2"
              className="opacity-50"
            />
          </svg>
          <span
            className="
              absolute -right-12 bottom-4 font-mono text-[10px] opacity-80
            ">
            FIG 1. ISOMETRIC_BLOCK
          </span>
          <svg
            className="absolute -top-10 -left-10"
            width="60"
            height="60"
            fill="none"
            stroke="currentColor">
            <line x1="10" y1="10" x2="50" y2="50" strokeWidth="1" />
            <polygon points="50,50 40,50 50,40" fill="currentColor" />
          </svg>
        </DecorElement>

        {/* 圆形/雷达阵列结构 */}
        <DecorElement
          className="
            pointer-events-none absolute bottom-16 left-[20%] decor-desktop-only
            hidden opacity-10
            lg:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <svg
            width="150"
            height="150"
            viewBox="0 0 150 150"
            fill="none"
            stroke="currentColor"
            strokeWidth="1">
            <circle cx="75" cy="75" r="60" strokeDasharray="4 4" />
            <circle cx="75" cy="75" r="40" />
            <circle cx="75" cy="75" r="10" fill="currentColor" />
            <line x1="15" y1="75" x2="135" y2="75" />
            <line x1="75" y1="15" x2="75" y2="135" />
          </svg>
        </DecorElement>

        {/* 2XL 专属：红石逻辑代数 */}
        <DecorElement
          className="
            pointer-events-none absolute top-[40%] right-[6%] decor-desktop-only
            hidden border-l border-tech-main/40 pl-4 font-mono text-[11px]
            leading-relaxed text-tech-main opacity-[0.35] mix-blend-multiply
            select-none
            2xl:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <div className="mb-2 font-bold text-tech-main-dark">
            {"//"} REDSTONE_BOOLEAN_LOGIC
          </div>
          <span>Y = (A ∧ B) ∨ (¬C)</span>
          <br />
          <span>T_delay = ∑(repeater_ticks) + 1_GT</span>
          <br />
          <span>C_out = MUX(S, A, B)</span>
          <br />
          <div className="mt-2 text-[9px] opacity-80">
            * VALIDATING SIGNAL STRENGTH (0-15)
            <br />* QUASI_CONNECTIVITY = TRUE
          </div>
        </DecorElement>

        {/* 2XL 专属：空间坐标变换矩阵 */}
        <DecorElement
          className="
            pointer-events-none absolute right-[25%] bottom-[30%]
            decor-desktop-only hidden font-mono text-[11px] opacity-[0.35]
            mix-blend-multiply select-none
            2xl:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <div className="mb-2 font-bold tracking-widest text-tech-main-dark">
            TRANSFORM_MATRIX_4x4
          </div>
          <div
            className="
              grid grid-cols-4 gap-2 border-x-2 border-tech-main/60
              bg-tech-main/5 px-3 py-1 text-center
            ">
            <span>1.0</span>
            <span>0.0</span>
            <span>0.0</span>
            <span>dx</span>
            <span>0.0</span>
            <span>1.0</span>
            <span>0.0</span>
            <span>dy</span>
            <span>0.0</span>
            <span>0.0</span>
            <span>1.0</span>
            <span>dz</span>
            <span>0.0</span>
            <span>0.0</span>
            <span>0.0</span>
            <span>1.0</span>
          </div>
        </DecorElement>

        {/* 2XL 专属：内存簇/寄存器网格 */}
        <DecorElement
          className="
            pointer-events-none absolute top-[60%] left-[3%] decor-desktop-only
            hidden font-mono text-[10px] opacity-[0.35] mix-blend-multiply
            select-none
            2xl:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <div className="mb-2 font-bold tracking-widest text-tech-main-dark">
            TICK_PHASE_ALLOCATION
          </div>
          <div
            className="
              grid grid-cols-6 gap-x-4 gap-y-2 border guide-line bg-tech-main/5
              p-2
            ">
            {HEX_VALUES.map((hexValue, i) => (
              <span
                key={i}
                className={
                  i % 7 === 0
                    ? `
                      relative font-bold text-tech-main-dark
                      before:absolute before:-left-3 before:content-['>']
                    `
                    : ""
                }>
                {hexValue}
              </span>
            ))}
          </div>
        </DecorElement>

        {/* 力学/机械引擎图纸 */}
        <DecorElement
          className="
            pointer-events-none absolute top-[15%] right-[15%]
            decor-desktop-only hidden opacity-[0.25] mix-blend-multiply
            select-none
            xl:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <svg
            width="140"
            height="160"
            viewBox="0 0 120 140"
            fill="none"
            stroke="currentColor"
            strokeWidth="1">
            <rect
              x="30"
              y="80"
              width="60"
              height="50"
              fill="currentColor"
              fillOpacity="0.15"
            />
            <rect x="45" y="40" width="30" height="40" strokeWidth="1.5" />
            <rect
              x="20"
              y="20"
              width="80"
              height="20"
              fill="currentColor"
              fillOpacity="0.25"
              strokeWidth="1.5"
            />
            <line x1="60" y1="20" x2="60" y2="0" strokeDasharray="3 3" />
            <line x1="45" y1="0" x2="75" y2="0" />
            <path
              d="M60 90 L60 110 M55 105 L60 110 L65 105"
              strokeWidth="1.5"
            />
            <text
              x="70"
              y="110"
              fontSize="9"
              fontFamily="monospace"
              fill="currentColor"
              fontWeight="bold">
              F_push
            </text>
          </svg>
        </DecorElement>
      </motion.div>

      {/* Midground Layer - Medium depth, moderate motion */}
      <motion.div
        className="absolute inset-0 z-1 homepage-decor-midground"
        style={{ x: mgTransform.x, y: mgTransform.y }}>
        {/* 左上角系统序列号 */}
        <div
          className="
            absolute top-8 left-8 hidden flex-col space-y-1
            md:flex
          ">
          <div
            className="
              font-mono text-xs tracking-widest text-tech-main-dark uppercase
              opacity-50
            ">
            [ GTMC_WIKI_SYSTEM ]
          </div>
          <div
            className="
              font-mono text-[10px] tracking-widest text-tech-main opacity-30
            ">
            BUILD.2026.03 // SECTOR-7G
          </div>
        </div>

        {/* 右上角HUD */}
        <div
          className="
            absolute top-8 right-12 hidden space-y-1 text-right font-mono
            text-[10px] text-tech-main opacity-40 select-none
            sm:block
          ">
          <p>
            SYS.TPS ::{" "}
            <span className="font-bold text-tech-main-dark">20.0 *</span>
          </p>
          <p>SYS.MSPT :: 12.4ms</p>
          <p>ENTITIES :: 342 / 1024</p>
          <p>BLOCK.ENT :: 1,204</p>
          <div className="my-2 h-px w-full bg-tech-main/30"></div>
          <p>COORD : X:1024 Y:64 Z:-512</p>
          <p className="mt-2 text-[8px] opacity-70">
            Light: 15 (15 sky, 0 block) <br /> Biome: minecraft:plains
          </p>
        </div>

        {/* Java 代码片段漂浮层 */}
        <DecorElement
          className="
            pointer-events-none absolute top-[18%] right-10 decor-desktop-only
            hidden opacity-40 mix-blend-multiply select-none
            lg:block
            xl:right-16
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={mgBlurMax}>
          <div
            className="
              border-l-4 border-tech-main/40 bg-tech-main/5 py-2 pl-4 font-mono
              text-[11px] leading-relaxed whitespace-pre text-tech-main
            ">
            {`{
  "Id": "minecraft:chest",
  "x": 1024, "y": 64, "z": -512,
  "Items": [
    {
      "Slot": 0b, "id": "minecraft:diamond", "Count": 64b
    },
    {
      "Slot": 1b, "id": "minecraft:redstone", "Count": 64b
    }
  ],
  // BlockEntityTag
}`}
          </div>
        </DecorElement>

        {/* 堆栈跟踪装饰 */}
        <DecorElement
          className="
            pointer-events-none absolute bottom-8 left-8 decor-desktop-only
            hidden font-mono text-[10px] text-red-500/40 mix-blend-multiply
            select-none
            lg:block
          "
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={mgBlurMax}>
          <span className="font-bold">
            at net.minecraft.world.level.block.piston.PistonBaseBlock.moveBlocks
          </span>
          (PistonBaseBlock.java:492) {"\n"}
          <br />
          <span className="font-bold">
            at net.minecraft.world.level.Level.tickBlockEntities
          </span>
          (Level.java:833) {"\n"}
          <br />
          <span className="font-bold text-red-600/60">
            Caused by: java.util.ConcurrentModificationException: Ticking block
            entity
          </span>
        </DecorElement>

        {/* 分散的瞄准/坐标十字 */}
        <div
          className="
            absolute top-1/4 right-[25%] decor-desktop-only hidden text-xl
            font-light opacity-30 select-none
            md:block
          ">
          +
        </div>
        <div
          className="
            absolute bottom-1/3 left-[8%] decor-desktop-only hidden text-xl
            font-light opacity-30 select-none
            md:block
          ">
          +
        </div>
        <div
          className="
            absolute top-[15%] left-[45%] decor-desktop-only hidden text-sm
            font-light opacity-30 select-none
            md:block
          ">
          +
        </div>

        {/* 贯穿全图的低调主辅助线 */}
        <div
          className="
            absolute top-[35%] right-0 decor-desktop-only hidden h-px w-[40%]
            bg-tech-main/20
            md:block
          ">
          <span
            className="
              absolute -top-4 right-10 font-mono text-[10px] opacity-50
            ">
            L-AXIS
          </span>
        </div>
        <div
          className="
            absolute top-0 left-[25%] decor-desktop-only hidden w-pxfull
            flex-col items-center bg-tech-main/10
            md:flex
          ">
          <div
            className="mt-[50vh] size-2 border border-tech-main/50 bg-tech-bg"></div>
        </div>

        {/* 技术图纸刻度尺 */}
        <div
          className="
            absolute top-0 left-0 decor-desktop-only hidden h-2 w-full
            overflow-hidden border-b border-tech-main/10 opacity-30
            md:flex
          ">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="
                relative h-full w-8 flex-none border-l border-tech-main/40
              ">
              {i % 4 === 0 && (
                <span className="absolute top-2 left-1 font-mono text-[8px]">
                  {i * 10}
                </span>
              )}
            </div>
          ))}
        </div>
        <div
          className="
            absolute top-0 left-0 decor-desktop-only hidden h-full w-2 flex-col
            overflow-hidden border-r border-tech-main/10 opacity-30
            md:flex
          ">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="
                relative h-8 w-full flex-none border-t border-tech-main/40
              "></div>
          ))}
        </div>
      </motion.div>

      {/* Hero Content - Highest z-index, stable positioning */}
      <main
        className="
          relative z-10 mx-auto mt-[7vh] flex min-h-max w-full max-w-7xl
          flex-col items-center justify-center px-4 py-24
        ">
        {/* Foreground Layer - Card chrome and nearby accents */}
        <motion.div
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
            "></div>

          {/* 尺寸标注装饰 */}
          <div
            className="
              absolute -top-6 left-0 flex w-full animate-fade-in items-center
              font-mono text-[10px] opacity-0 [animation-delay:1.5s]
              fill-mode-forwards
            ">
            <span>|&lt;</span>
            <span className="mx-2 grow border-t border-tech-main/30"></span>
            <span>900px</span>
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
              "></div>

            {/* 工业感/图纸感的定位刻度 */}
            <div
              className="
                absolute top-0 left-0 size-3 -translate-0.5 border-t-2
                border-l-2 border-tech-main
              "></div>
            <div
              className="
                absolute right-0 bottom-0 size-3 translate-0.5 border-r-2
                border-b-2 border-tech-main
              "></div>

            {/* 钉子/打孔装饰 */}
            <div
              className="
                absolute top-4 right-4 size-1.5 rounded-full border
                border-tech-main/50 bg-tech-bg/50
              "></div>
            <div
              className="
                absolute bottom-4 left-4 size-1.5 rounded-full border
                border-tech-main/50 bg-tech-bg/50
              "></div>

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
                  "></div>
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
                relative mb-6 flex items-center overflow-hidden text-3xl
                font-bold tracking-tight text-tech-main-dark
                sm:text-4xl
                md:text-6xl
                lg:text-7xl
              ">
              <span
                className="
                  mr-6 inline-block animate-tech-slide-in opacity-0
                  [animation-delay:0.5s] fill-mode-forwards
                ">
                <Logo
                  size="2xl"
                  showSlash={false}
                  className="pointer-events-none"
                />
              </span>
              <span
                className="
                  inline-block animate-tech-slide-in font-light text-tech-main
                  opacity-0 mix-blend-multiply [animation-delay:0.7s]
                  fill-mode-forwards
                ">
                Wiki
              </span>
              <span
                className="
                  ml-4 inline-block h-[1em] w-6 animate-pulse bg-tech-main
                  align-middle opacity-0 [animation-delay:1s] fill-mode-forwards
                "></span>
            </h1>

            <p
              className="
                max-w-xl animate-fade-in border-l-[3px] border-tech-main/40 pl-5
                text-base/relaxed tracking-wide text-tech-main-dark/80 opacity-0
                [animation-delay:1.2s] [animation-duration:1s]
                [animation-translate-y:20px] fill-mode-forwards
                md:text-lg
              ">
              支持多人协作、内容审核与 Git 自动备份的 MC 资源与知识整合站点。
              <span
                className="
                  mt-4 flex items-center font-mono text-[11px]
                  tracking-tech-wide opacity-60
                ">
                <span
                  className="
                    mr-2 size-2 animate-pulse rounded-full bg-tech-main
                  "></span>
                &gt;&gt; MODPACKS | MECHANICS | TUTORIALS
              </span>
            </p>
          </div>
        </motion.div>

        {/* 操作入口 */}
        <div
          className="
            relative z-20 flex w-full animate-slide-up-fade flex-col
            items-stretch justify-center gap-5 opacity-0 [animation-delay:1.4s]
            fill-mode-forwards
            sm:w-auto sm:flex-row sm:items-center
          ">
          <Link
            href="/articles"
            prefetch
            onClick={(event) => {
              if (isAccessingDatabase) {
                event.preventDefault()
                return
              }

              setIsAccessingDatabase(true)
            }}
            className="
              w-full
              sm:w-auto
            ">
            <BrutalButton
              variant="primary"
              disabled={isAccessingDatabase}
              className="
                flex h-12 w-full items-center justify-center px-8 py-3 text-sm
                tracking-widest uppercase shadow-md transition-transform
                duration-300
                hover:scale-105
                active:scale-95
                disabled:cursor-wait disabled:opacity-90
                sm:w-auto
              ">
              {isAccessingDatabase ? (
                <>
                  <span className="inline-block size-2 animate-pulse bg-white" />
                  INITIALIZING DATABASE...
                </>
              ) : (
                "ACCESS DATABASE →"
              )}
            </BrutalButton>
          </Link>
          <Link
            href="/login"
            className="
              w-full
              sm:w-auto
            ">
            <BrutalButton
              variant="ghost"
              className="
                flex h-12 w-full items-center justify-center border
                border-tech-main/40 bg-white/70 px-8 py-3 text-sm font-medium
                tracking-widest text-tech-main-dark uppercase shadow-sm
                backdrop-blur-md transition-all duration-300
                hover:border-tech-main hover:bg-white
                sm:w-auto
              ">
              /{"/"} INITIALIZE LOGIN
            </BrutalButton>
          </Link>
        </div>

        {/* 底部隐喻：MC典型的格子/合成槽堆叠图形列阵 */}
        <div
          className="
            pointer-events-none relative mt-12 flex space-x-1 opacity-40
          ">
          <div
            className="absolute -top-4 font-mono text-[8px] text-tech-main/60">
            INVENTORY_SLOTS_
          </div>
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`
                flex size-8 items-center justify-center
                ${
                  i === 3
                    ? `
                      border-2 border-tech-main-dark bg-tech-main/10
                      shadow-[0_0_8px_rgba(96,112,143,0.3)]
                    `
                    : `border border-tech-main/40`
                }
              `}>
              {i === 3 && (
                <div className="size-4 rotate-45 bg-tech-main-dark/80"></div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
