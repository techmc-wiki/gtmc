"use client"

import { motion, MotionValue } from "motion/react"
import { DecorElement } from "./decor-element"

export function MidgroundLayer({
  mgTransform,
  smoothMouseX,
  smoothMouseY,
  blurMax,
}: {
  mgTransform: { x: MotionValue<number>; y: MotionValue<number> }
  smoothMouseX: MotionValue<number>
  smoothMouseY: MotionValue<number>
  blurMax: number
}) {
  return (
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
        <div className="my-2 h-px w-full bg-tech-main/30" />
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
        blurMax={blurMax}>
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
          pointer-events-none absolute bottom-8 left-8 decor-desktop-only hidden
          font-mono text-[10px] text-red-500/40 mix-blend-multiply select-none
          lg:block
        "
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={blurMax}>
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
          absolute top-1/2 right-0 decor-desktop-only hidden h-px w-[40%]
          bg-tech-main/20
          md:block
        ">
        <span className="absolute -top-4 right-10 font-mono text-[10px] opacity-50">
          L-AXIS
        </span>
      </div>
      <div
        className="
          absolute top-0 left-[25%] decor-desktop-only hidden w-pxfull flex-col
          items-center bg-tech-main/10
          md:flex
        ">
        <div className="mt-[50vh] size-2 border border-tech-main/50 bg-tech-bg" />
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
            "
          />
        ))}
      </div>
    </motion.div>
  )
}
