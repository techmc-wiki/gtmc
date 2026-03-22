"use client"

import Link from "next/link"
import { useRef, useCallback } from "react"
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
    },
  )

  return (
    <motion.div ref={ref} className={className} style={{ filter }}>
      {children}
    </motion.div>
  )
}

export default function Home() {
  const motionDriver = useHomepageMotion()
  const {
    background: bgTransform,
    midground: mgTransform,
    foreground: fgTransform,
    smoothMouseX,
    smoothMouseY,
    isReducedMotion,
  } = motionDriver

  const bgBlurMax = isReducedMotion
    ? 0
    : HOMEPAGE_MOTION.blurMax.background
  const mgBlurMax = isReducedMotion
    ? 0
    : HOMEPAGE_MOTION.blurMax.midground

  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative flex h-screen w-full overflow-hidden font-sans">
      {/* Background Layer - Furthest depth, slowest motion */}
      <motion.div
        className="homepage-decor-background absolute inset-0 z-0"
        style={{ x: bgTransform.x, y: bgTransform.y }}>
        {/* 巨型背景水印 */}
        <DecorElement
          className="text-tech-main decor-desktop-only pointer-events-none absolute top-1/3 -right-20 hidden rotate-90 text-[10rem] font-black tracking-tighter whitespace-nowrap opacity-[0.05] mix-blend-multiply select-none lg:block"
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          SCHEMATIC_01
        </DecorElement>

        {/* NBT二进制/Hex Dump 背景层 */}
        <DecorElement
          className="text-tech-main decor-desktop-only pointer-events-none absolute top-[20%] left-[5%] hidden font-mono text-[10px] leading-tight whitespace-pre opacity-[0.25] mix-blend-multiply select-none xl:block"
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          00000000: 1f8b 0800 0000 0000 0000 edc1 0b00 0000
          .......4........{"\n"}
          00000010: 0010 0700 1101 0005 6c65 7665 6c00 0800
          ........level...{"\n"}
          00000020: 0b44 6174 6101 0006 7261 6e64 6f6d 5365
          .Data...randomSe{"\n"}
          00000030: 6564 0000 0000 3b9a ca00 0400 0c62 6c6f
          ed....;......blo{"\n"}
          00000040: 636b 5f6c 6967 6874 5f64 6174 610a 0000
          ck_light_data...{"\n"}
        </DecorElement>

        {/* MC 方块视角的几何线条叠加 */}
        <DecorElement
          className="decor-desktop-only pointer-events-none absolute right-[10%] bottom-[20%] hidden opacity-20 lg:block"
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
          <span className="absolute -right-12 bottom-4 font-mono text-[10px] opacity-80">
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
          className="decor-desktop-only pointer-events-none absolute bottom-16 left-[20%] hidden opacity-10 lg:block"
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
          className="text-tech-main border-tech-main/40 decor-desktop-only pointer-events-none absolute top-[40%] right-[6%] hidden border-l pl-4 font-mono text-[11px] leading-relaxed opacity-[0.35] mix-blend-multiply select-none 2xl:block"
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <div className="text-tech-main-dark mb-2 font-bold">
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
          className="decor-desktop-only pointer-events-none absolute right-[25%] bottom-[30%] hidden font-mono text-[11px] opacity-[0.35] mix-blend-multiply select-none 2xl:block"
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <div className="text-tech-main-dark mb-2 font-bold tracking-widest">
            TRANSFORM_MATRIX_4x4
          </div>
          <div className="border-tech-main/60 bg-tech-main/5 grid grid-cols-4 gap-2 border-r-2 border-l-2 px-3 py-1 text-center">
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
          className="decor-desktop-only pointer-events-none absolute top-[60%] left-[3%] hidden font-mono text-[10px] opacity-[0.35] mix-blend-multiply select-none 2xl:block"
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={bgBlurMax}>
          <div className="text-tech-main-dark mb-2 font-bold tracking-widest">
            TICK_PHASE_ALLOCATION
          </div>
          <div className="bg-tech-main/5 border-tech-main/20 grid grid-cols-6 gap-x-4 gap-y-2 border p-2">
            {HEX_VALUES.map((hexValue, i) => (
              <span
                key={i}
                className={
                  i % 7 === 0
                    ? "text-tech-main-dark relative font-bold before:absolute before:-left-3 before:content-['>']"
                    : ""
                }>
                {hexValue}
              </span>
            ))}
          </div>
        </DecorElement>

        {/* 力学/机械引擎图纸 */}
        <DecorElement
          className="decor-desktop-only pointer-events-none absolute top-[15%] right-[15%] hidden opacity-[0.25] mix-blend-multiply select-none xl:block"
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
            <rect
              x="45"
              y="40"
              width="30"
              height="40"
              strokeWidth="1.5"
            />
            <rect
              x="20"
              y="20"
              width="80"
              height="20"
              fill="currentColor"
              fillOpacity="0.25"
              strokeWidth="1.5"
            />
            <line
              x1="60"
              y1="20"
              x2="60"
              y2="0"
              strokeDasharray="3 3"
            />
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
        className="homepage-decor-midground absolute inset-0 z-[1]"
        style={{ x: mgTransform.x, y: mgTransform.y }}>
        {/* 左上角系统序列号 */}
        <div className="absolute top-8 left-8 flex hidden flex-col space-y-1 md:flex">
          <div className="text-tech-main-dark font-mono text-xs tracking-widest uppercase opacity-50">
            [ GTMC_WIKI_SYSTEM ]
          </div>
          <div className="text-tech-main font-mono text-[10px] tracking-widest opacity-30">
            BUILD.2026.03 // SECTOR-7G
          </div>
        </div>

        {/* 右上角HUD */}
        <div className="text-tech-main absolute top-8 right-12 hidden space-y-1 text-right font-mono text-[10px] opacity-40 select-none sm:block">
          <p>
            SYS.TPS ::{" "}
            <span className="text-tech-main-dark font-bold">
              20.0 *
            </span>
          </p>
          <p>SYS.MSPT :: 12.4ms</p>
          <p>ENTITIES :: 342 / 1024</p>
          <p>BLOCK.ENT :: 1,204</p>
          <div className="bg-tech-main/30 my-2 h-[1px] w-full"></div>
          <p>COORD : X:1024 Y:64 Z:-512</p>
          <p className="mt-2 text-[8px] opacity-70">
            Light: 15 (15 sky, 0 block) <br /> Biome: minecraft:plains
          </p>
        </div>

        {/* Java 代码片段漂浮层 */}
        <DecorElement
          className="decor-desktop-only pointer-events-none absolute top-[18%] right-10 hidden opacity-40 mix-blend-multiply select-none lg:block xl:right-16"
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={mgBlurMax}>
          <div className="text-tech-main border-tech-main/40 bg-tech-main/5 border-l-4 py-2 pl-4 font-mono text-[11px] leading-relaxed whitespace-pre">
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
          className="decor-desktop-only pointer-events-none absolute bottom-8 left-8 hidden font-mono text-[10px] text-red-500/40 mix-blend-multiply select-none lg:block"
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          blurMax={mgBlurMax}>
          <span className="font-bold">
            at
            net.minecraft.world.level.block.piston.PistonBaseBlock.moveBlocks
          </span>
          (PistonBaseBlock.java:492) {"\n"}
          <br />
          <span className="font-bold">
            at net.minecraft.world.level.Level.tickBlockEntities
          </span>
          (Level.java:833) {"\n"}
          <br />
          <span className="font-bold text-red-600/60">
            Caused by: java.util.ConcurrentModificationException:
            Ticking block entity
          </span>
        </DecorElement>

        {/* 分散的瞄准/坐标十字 */}
        <div className="decor-desktop-only absolute top-1/4 right-[25%] hidden text-xl font-light opacity-30 select-none md:block">
          +
        </div>
        <div className="decor-desktop-only absolute bottom-1/3 left-[8%] hidden text-xl font-light opacity-30 select-none md:block">
          +
        </div>
        <div className="decor-desktop-only absolute top-[15%] left-[45%] hidden text-sm font-light opacity-30 select-none md:block">
          +
        </div>

        {/* 贯穿全图的低调主辅助线 */}
        <div className="bg-tech-main/20 decor-desktop-only absolute top-[35%] right-0 hidden h-[1px] w-[40%] md:block">
          <span className="absolute -top-4 right-10 font-mono text-[10px] opacity-50">
            L-AXIS
          </span>
        </div>
        <div className="bg-tech-main/10 decor-desktop-only absolute top-0 left-[25%] flex hidden h-[100%] w-[1px] flex-col items-center md:flex">
          <div className="bg-tech-bg border-tech-main/50 mt-[50vh] h-2 w-2 border"></div>
        </div>

        {/* 技术图纸刻度尺 */}
        <div className="border-tech-main/10 decor-desktop-only absolute top-0 left-0 flex hidden h-2 w-full overflow-hidden border-b opacity-30 md:flex">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="border-tech-main/40 relative h-full w-8 flex-none border-l">
              {i % 4 === 0 && (
                <span className="absolute top-2 left-1 font-mono text-[8px]">
                  {i * 10}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="border-tech-main/10 decor-desktop-only absolute top-0 left-0 flex hidden h-full w-2 flex-col overflow-hidden border-r opacity-30 md:flex">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="border-tech-main/40 relative h-8 w-full flex-none border-t"></div>
          ))}
        </div>
      </motion.div>

      {/* Hero Content - Highest z-index, stable positioning */}
      <main className="relative z-10 mx-auto mt-[7vh] flex min-h-[max-content] w-full max-w-7xl flex-col items-center justify-center px-4 py-24">
        {/* Foreground Layer - Card chrome and nearby accents */}
        <motion.div
          className="homepage-decor-foreground group animate-tech-pop-in relative mb-8 w-full max-w-3xl opacity-0 [animation-delay:0.2s] [animation-duration:0.8s] [animation-fill-mode:forwards]"
          style={{
            x: fgTransform.x,
            y: fgTransform.y,
            rotateX: fgTransform.rotateX,
            rotateY: fgTransform.rotateY,
            transformStyle: "preserve-3d",
          }}>
          {/* 下层错位阴影框 */}
          <div className="border-tech-main/20 absolute inset-0 -z-10 translate-x-3 translate-y-3 border bg-transparent transition-transform duration-500 ease-out group-hover:translate-x-4 group-hover:translate-y-4"></div>

          {/* 尺寸标注装饰 */}
          <div className="animate-fade-in absolute -top-6 left-0 flex w-full items-center font-mono text-[10px] opacity-0 [animation-delay:1.5s] [animation-fill-mode:forwards]">
            <span>|&lt;</span>
            <span className="border-tech-main/30 mx-2 flex-grow border-t"></span>
            <span>900px</span>
            <span className="border-tech-main/30 mx-2 flex-grow border-t"></span>
            <span>&gt;|</span>
          </div>

          <div className="border-tech-main/40 relative overflow-hidden border bg-white/60 p-6 shadow-sm backdrop-blur-md sm:p-10 md:p-14">
            {/* 闪光扫过效果 */}
            <div className="pointer-events-none absolute inset-0 translate-x-[-200%] -skew-x-12 animate-[shimmer_3s_infinite_2s] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

            {/* 工业感/图纸感的定位刻度 */}
            <div className="border-tech-main absolute top-0 left-0 h-3 w-3 -translate-x-[2px] -translate-y-[2px] border-t-2 border-l-2"></div>
            <div className="border-tech-main absolute right-0 bottom-0 h-3 w-3 translate-x-[2px] translate-y-[2px] border-r-2 border-b-2"></div>

            {/* 钉子/打孔装饰 */}
            <div className="border-tech-main/50 bg-tech-bg/50 absolute top-4 right-4 h-1.5 w-1.5 rounded-full border"></div>
            <div className="border-tech-main/50 bg-tech-bg/50 absolute bottom-4 left-4 h-1.5 w-1.5 rounded-full border"></div>

            <div className="animate-fade-in mb-6 flex items-center space-x-4 opacity-0 [animation-delay:0.8s] [animation-fill-mode:forwards]">
              <div className="bg-tech-main/5 border-tech-main/40 relative flex h-10 w-10 items-center justify-center border transition-transform duration-500 group-hover:rotate-90">
                <div className="bg-tech-main/30 group-hover:bg-tech-main/60 h-4 w-4 transition-colors"></div>
              </div>
              <h2 className="text-tech-main/80 font-mono text-sm tracking-[0.3em] uppercase">
                Knowledge Base_
              </h2>
            </div>

            <h1 className="text-tech-main-dark relative mb-6 flex items-center overflow-hidden text-3xl font-bold tracking-tight sm:text-4xl md:text-6xl lg:text-7xl">
              <span className="animate-tech-slide-in mr-6 inline-block opacity-0 [animation-delay:0.5s] [animation-fill-mode:forwards]">
                <Logo
                  size="2xl"
                  showSlash={false}
                  className="pointer-events-none"
                />
              </span>
              <span className="text-tech-main animate-tech-slide-in inline-block font-light opacity-0 mix-blend-multiply [animation-delay:0.7s] [animation-fill-mode:forwards]">
                Wiki
              </span>
              <span className="bg-tech-main ml-4 inline-block h-[1em] w-6 animate-pulse align-middle opacity-0 [animation-delay:1s] [animation-fill-mode:forwards]"></span>
            </h1>

            <p className="text-tech-main-dark/80 border-tech-main/40 animate-fade-in max-w-xl border-l-[3px] pl-5 text-base leading-relaxed tracking-wide opacity-0 [animation-delay:1.2s] [animation-duration:1s] [animation-fill-mode:forwards] [animation-translate-y:20px] md:text-lg">
              支持多人协作、内容审核与 Git 自动备份的 MC
              资源与知识整合站点。
              <span className="mt-4 flex items-center font-mono text-[11px] tracking-[0.2em] opacity-60">
                <span className="bg-tech-main mr-2 h-2 w-2 animate-pulse rounded-full"></span>
                &gt;&gt; MODPACKS | MECHANICS | TUTORIALS
              </span>
            </p>
          </div>
        </motion.div>

        {/* 操作入口 */}
        <div className="animate-slide-up-fade relative z-20 flex w-full flex-col items-stretch justify-center gap-5 opacity-0 [animation-delay:1.4s] [animation-fill-mode:forwards] sm:w-auto sm:flex-row sm:items-center">
          <Link href="/articles" className="w-full sm:w-auto">
            <BrutalButton
              variant="primary"
              className="flex h-12 w-full items-center justify-center px-8 py-3 text-sm tracking-[0.1em] uppercase shadow-md transition-transform duration-300 hover:scale-105 active:scale-95 sm:w-auto">
              ACCESS DATABASE →
            </BrutalButton>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <BrutalButton
              variant="ghost"
              className="text-tech-main-dark border-tech-main/40 hover:border-tech-main flex h-12 w-full items-center justify-center border bg-white/70 px-8 py-3 text-sm font-medium tracking-[0.1em] uppercase shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white sm:w-auto">
              /{"/"} INITIALIZE LOGIN
            </BrutalButton>
          </Link>
        </div>

        {/* 底部隐喻：MC典型的格子/合成槽堆叠图形列阵 */}
        <div className="pointer-events-none relative mt-12 flex space-x-1 opacity-40">
          <div className="text-tech-main/60 absolute -top-4 font-mono text-[8px]">
            INVENTORY_SLOTS_
          </div>
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`flex h-8 w-8 items-center justify-center ${i === 3 ? "border-tech-main-dark bg-tech-main/10 border-2 shadow-[0_0_8px_rgba(96,112,143,0.3)]" : "border-tech-main/40 border"}`}>
              {i === 3 && (
                <div className="bg-tech-main-dark/80 h-4 w-4 rotate-45"></div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
