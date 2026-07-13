import styles from "./drafting-canvas.module.css"

const RULER_TICKS_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, currentColor 31px, currentColor 32px)",
} as const

function RegistrationCross({ className }: { className: string }) {
  return (
    <div className={`absolute size-10 ${className}`}>
      <span className="bg-tech-main absolute top-1/2 left-0 h-px w-full" />
      <span className="bg-tech-main absolute top-0 left-1/2 h-full w-px" />
      <span className="border-tech-main bg-tech-bg absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 border" />
    </div>
  )
}

function ChunkSectionStudy() {
  return (
    <div className="absolute top-[34%] right-2 w-40 opacity-[0.11] dark:opacity-[0.07]">
      <svg
        viewBox="0 0 180 176"
        fill="none"
        stroke="currentColor"
        strokeWidth="1">
        <path d="M90 14 154 50 90 86 26 50 90 14Z" />
        <path d="M26 50v72l64 38 64-38V50" />
        <path d="M90 86v74" />
        <path d="m26 122 64-36 64 36" strokeDasharray="4 5" />
        <path d="M58 32v72M122 32v72M42 41l64 37M74 23l64 37" opacity="0.55" />
        <path d="M163 50h10M168 45v10M90 4v10" />
      </svg>
      <div className="border-tech-main/50 mt-2 flex items-center justify-between border-t pt-1.5 font-mono text-[0.5625rem] tracking-[0.18em] uppercase">
        <span>X/Z</span>
        <span>16 × 16</span>
      </div>
    </div>
  )
}

function CoordinateStudy() {
  return (
    <div className="absolute top-[66%] left-3 w-40 opacity-[0.12] dark:opacity-[0.08]">
      <div className="flex items-center font-mono text-[0.5625rem] tracking-[0.12em]">
        <span>|&lt;</span>
        <span className="border-tech-main/60 mx-2 grow border-t" />
        <span>16 × 16</span>
        <span className="border-tech-main/60 mx-2 grow border-t" />
        <span>&gt;|</span>
      </div>
      <div className="border-tech-main/50 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-l pl-3 font-mono text-[0.5625rem] tracking-[0.12em]">
        <span>X</span>
        <span>+1024</span>
        <span>Y</span>
        <span>+0064</span>
        <span>Z</span>
        <span>-0512</span>
      </div>
    </div>
  )
}

export function HomepageDraftingCanvas() {
  return (
    <div
      aria-hidden="true"
      className="text-tech-main pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
      <div className="border-tech-main/10 absolute inset-y-0 left-0 hidden w-2 border-r opacity-40 md:block dark:opacity-25">
        <div className="h-full w-full" style={RULER_TICKS_STYLE} />
      </div>

      <div className="absolute inset-y-0 left-1/2 hidden w-full max-w-3xl -translate-x-1/2 lg:block">
        <div className={`${styles.axis} absolute inset-y-0 -left-8`}>
          <div className="bg-tech-main/10 dark:bg-tech-main/8 absolute inset-y-0 left-0 w-px" />
          <div
            className={`${styles.trace} bg-tech-signal/55 absolute inset-y-0 left-0 w-px`}
          />
          <div className={`${styles.plotterHead} absolute top-0 left-0`}>
            <span className="bg-tech-signal absolute top-0 left-0 size-2 -translate-x-1/2 -translate-y-1/2" />
            <span className="bg-tech-signal/70 absolute top-0 right-2 h-px w-8" />
            <span className="text-tech-signal absolute top-0 right-11 -translate-y-1/2 font-mono text-[0.5rem] tracking-[0.16em] whitespace-nowrap uppercase">
              ΔY
            </span>
          </div>
          <div className="border-tech-main/30 bg-tech-bg absolute top-[calc(100dvh-5rem)] -left-[0.1875rem] size-2 border" />
        </div>
      </div>

      <div className="absolute inset-y-0 left-1/2 hidden w-full max-w-6xl -translate-x-1/2 xl:block">
        <RegistrationCross className="top-[24%] left-5 opacity-[0.1] dark:opacity-[0.06]" />
        <ChunkSectionStudy />
        <CoordinateStudy />
        <RegistrationCross className="right-6 bottom-[11%] opacity-[0.1] dark:opacity-[0.06]" />
      </div>
    </div>
  )
}
