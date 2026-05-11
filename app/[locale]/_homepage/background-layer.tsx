import { motion, MotionValue } from "motion/react"
import { DecorElement } from "./decor-element"

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

export function BackgroundLayer({
  bgTransform,
  smoothMouseX,
  smoothMouseY,
  blurMax,
  isReducedMotion = false,
}: {
  bgTransform: { x: MotionValue<number>; y: MotionValue<number> }
  smoothMouseX: MotionValue<number>
  smoothMouseY: MotionValue<number>
  blurMax: number
  isReducedMotion?: boolean
}) {
  return (
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
        blurMax={blurMax}
        isReducedMotion={isReducedMotion}>
        SCHEMATIC_01
      </DecorElement>

      {/* NBT二进制/Hex Dump 背景层 */}
      <DecorElement
        className="
           pointer-events-none absolute top-[20%] left-[5%] decor-desktop-only
           hidden font-mono text-[0.625rem] leading-tight whitespace-pre
           text-tech-main opacity-[0.25] mix-blend-multiply select-none
           xl:block
         "
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={blurMax}
        isReducedMotion={isReducedMotion}>
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
        blurMax={blurMax}
        isReducedMotion={isReducedMotion}>
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
             absolute -right-12 bottom-4 font-mono text-[0.625rem] opacity-80
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
        blurMax={blurMax}
        isReducedMotion={isReducedMotion}>
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
           hidden border-l border-tech-main/40 pl-4 font-mono text-[0.6875rem]
           leading-relaxed text-tech-main opacity-[0.35] mix-blend-multiply
           select-none
           2xl:block
         "
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={blurMax}
        isReducedMotion={isReducedMotion}>
        <div className="mb-2 font-bold text-tech-main-dark">
          {"//"} REDSTONE_BOOLEAN_LOGIC
        </div>
        <span>Y = (A ∧ B) ∨ (¬C)</span>
        <br />
        <span>T_delay = ∑(repeater_ticks) + 1_GT</span>
        <br />
        <span>C_out = MUX(S, A, B)</span>
        <br />
        <div className="mt-2 text-[0.5625rem] opacity-80">
          * VALIDATING SIGNAL STRENGTH (0-15)
          <br />* QUASI_CONNECTIVITY = TRUE
        </div>
      </DecorElement>

      {/* 2XL 专属：空间坐标变换矩阵 */}
      <DecorElement
        className="
           pointer-events-none absolute right-[25%] bottom-[30%]
           decor-desktop-only hidden font-mono text-[0.6875rem] opacity-[0.35]
           mix-blend-multiply select-none
           2xl:block
         "
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={blurMax}
        isReducedMotion={isReducedMotion}>
        <div className="mb-2 font-bold tracking-widest text-tech-main-dark">
          TRANSFORM_MATRIX_4x4
        </div>
        <div
          className="
            grid grid-cols-4 gap-2 border-x-2 border-tech-main/60 bg-tech-main/5
            px-3 py-1 text-center
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
           hidden font-mono text-[0.625rem] opacity-[0.35] mix-blend-multiply
           select-none
           2xl:block
         "
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={blurMax}
        isReducedMotion={isReducedMotion}>
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
          pointer-events-none absolute top-[15%] right-[15%] decor-desktop-only
          hidden opacity-[0.25] mix-blend-multiply select-none
          xl:block
        "
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={blurMax}
        isReducedMotion={isReducedMotion}>
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
          <path d="M60 90 L60 110 M55 105 L60 110 L65 105" strokeWidth="1.5" />
          <text
            x="70"
            y="110"
            fontSize="9"
            className="font-mono"
            fill="currentColor"
            fontWeight="bold">
            F_push
          </text>
        </svg>
      </DecorElement>
    </motion.div>
  )
}
