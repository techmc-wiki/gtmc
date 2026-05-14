"use client"

import * as React from "react"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { cn } from "@/lib/cn"

export type OperationProgressState = "idle" | "running" | "success" | "error"

export interface OperationProgressStage {
  id: string
  label: string
  durationMs: number
}

interface OperationProgressProps {
  state: OperationProgressState
  title: string
  stages: OperationProgressStage[]
  successLabel: string
  errorLabel: string
  className?: string
  compact?: boolean
}

interface StageTimelineEntry extends OperationProgressStage {
  endMs: number
  endProgress: number
  startMs: number
  startProgress: number
}

const MIN_VISIBLE_PROGRESS = 0.06
const RUNNING_PROGRESS_LIMIT = 0.94
const SPRING_STIFFNESS = 16
const SPRING_DAMPING = 10

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function buildTimeline(stages: OperationProgressStage[]): StageTimelineEntry[] {
  const totalDuration = Math.max(
    stages.reduce((sum, stage) => sum + stage.durationMs, 0),
    1
  )

  let currentMs = 0
  let currentProgress = MIN_VISIBLE_PROGRESS

  return stages.map((stage, index) => {
    const startMs = currentMs
    currentMs += stage.durationMs

    const endProgress =
      index === stages.length - 1
        ? RUNNING_PROGRESS_LIMIT
        : MIN_VISIBLE_PROGRESS +
          (RUNNING_PROGRESS_LIMIT - MIN_VISIBLE_PROGRESS) *
            (currentMs / totalDuration)

    const entry: StageTimelineEntry = {
      ...stage,
      endMs: currentMs,
      endProgress,
      startMs,
      startProgress: currentProgress,
    }

    currentProgress = endProgress
    return entry
  })
}

function getRunningTarget(
  elapsedMs: number,
  timeline: StageTimelineEntry[]
): number {
  if (timeline.length === 0) return MIN_VISIBLE_PROGRESS

  const activeStage =
    timeline.find((stage) => elapsedMs < stage.endMs) ??
    timeline[timeline.length - 1]

  const stageDuration = Math.max(activeStage.endMs - activeStage.startMs, 1)
  const stageElapsed = clamp(
    (elapsedMs - activeStage.startMs) / stageDuration,
    0,
    1
  )

  return (
    activeStage.startProgress +
    (activeStage.endProgress - activeStage.startProgress) *
      easeOutCubic(stageElapsed)
  )
}

function getStageIndex(elapsedMs: number, timeline: StageTimelineEntry[]) {
  if (timeline.length === 0) return 0

  const index = timeline.findIndex((stage) => elapsedMs < stage.endMs)
  return index === -1 ? timeline.length - 1 : index
}

export function OperationProgress({
  state,
  title,
  stages,
  successLabel,
  errorLabel,
  className,
  compact = false,
}: OperationProgressProps) {
  const timeline = React.useMemo(() => buildTimeline(stages), [stages])
  const [displayProgress, setDisplayProgress] = React.useState(0)
  const [stageIndex, setStageIndex] = React.useState(0)

  const animationFrameRef = React.useRef<number | null>(null)
  const lastFrameRef = React.useRef<number | null>(null)
  const progressRef = React.useRef(0)
  const startedAtRef = React.useRef<number | null>(null)
  const stateRef = React.useRef<OperationProgressState>(state)
  const velocityRef = React.useRef(0)

  React.useEffect(() => {
    const stopAnimation = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    const previousState = stateRef.current
    stateRef.current = state

    if (state === "idle") {
      stopAnimation()
      progressRef.current = 0
      velocityRef.current = 0
      startedAtRef.current = null
      lastFrameRef.current = null
      return stopAnimation
    }

    if (state === "error") {
      stopAnimation()
      velocityRef.current = 0
      lastFrameRef.current = null
      return stopAnimation
    }

    if (state === "running" && previousState !== "running") {
      progressRef.current = MIN_VISIBLE_PROGRESS * 0.72
      velocityRef.current = 0
      startedAtRef.current = null
      lastFrameRef.current = null
    }

    const step = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now
      }

      if (startedAtRef.current === null) {
        startedAtRef.current = now
      }

      const deltaSeconds = clamp(
        (now - lastFrameRef.current) / 1000,
        0.001,
        0.05
      )
      lastFrameRef.current = now

      const elapsedMs = now - startedAtRef.current
      const targetProgress =
        state === "success" ? 1 : getRunningTarget(elapsedMs, timeline)

      if (state === "running") {
        setStageIndex(getStageIndex(elapsedMs, timeline))
      } else {
        setStageIndex(Math.max(stages.length - 1, 0))
      }

      velocityRef.current +=
        (targetProgress - progressRef.current) * SPRING_STIFFNESS * deltaSeconds
      velocityRef.current *= Math.exp(-SPRING_DAMPING * deltaSeconds)

      const nextProgress = clamp(
        progressRef.current + velocityRef.current * deltaSeconds,
        0,
        state === "success" ? 1 : RUNNING_PROGRESS_LIMIT
      )

      progressRef.current = nextProgress
      setDisplayProgress(nextProgress)

      const isSettled =
        Math.abs(targetProgress - nextProgress) < 0.002 &&
        Math.abs(velocityRef.current) < 0.002

      if (state === "success" && isSettled) {
        progressRef.current = 1
        setDisplayProgress(1)
        stopAnimation()
        return
      }

      animationFrameRef.current = requestAnimationFrame(step)
    }

    stopAnimation()
    animationFrameRef.current = requestAnimationFrame(step)

    return stopAnimation
  }, [state, stages.length, timeline])

  if (state === "idle" || stages.length === 0) {
    return null
  }

  const percent = Math.round(displayProgress * 100)
  const activeStage =
    stages[Math.min(stageIndex, Math.max(stages.length - 1, 0))]
  const statusLabel =
    state === "success"
      ? successLabel
      : state === "error"
        ? errorLabel
        : activeStage?.label || title

  return (
    <section
      className={cn(
        "guide-line relative overflow-hidden border bg-white/85 backdrop-blur-sm",
        compact ? "p-3" : "p-4",
        state === "error" ? "border-red-500/30 bg-red-500/5" : "",
        className
      )}
      role="status"
      aria-live="polite">
      <CornerBrackets
        color={state === "error" ? "border-red-500/20" : "border-tech-main/20"}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "from-tech-main/10 via-tech-accent/25 absolute inset-y-0 left-0 bg-linear-to-r to-transparent transition-[width] duration-300",
            state === "running" ? "animate-blueprint-sweep" : "",
            state === "success" ? "animate-scan-confirm" : "",
            state === "error"
              ? "from-red-500/10 via-red-400/15 to-transparent"
              : ""
          )}
          style={{ width: `${Math.max(percent, 8)}%` }}
        />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-tech-main/50 font-mono text-[0.6875rem] tracking-widest uppercase">
            {title}
          </p>
          <p
            className={cn(
              "font-mono text-[0.75rem] tracking-widest uppercase",
              state === "success"
                ? "text-green-600"
                : state === "error"
                  ? "text-red-600"
                  : "text-tech-main-dark"
            )}>
            {statusLabel}
          </p>
        </div>

        <div className="guide-line text-tech-main/70 shrink-0 border bg-white/70 px-2 py-1 font-mono text-[0.6875rem] tracking-widest uppercase">
          {percent.toString().padStart(2, "0")}%
        </div>
      </div>

      <div
        className="guide-line bg-tech-main/5 relative mt-3 h-2 overflow-hidden border"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}>
        <div
          className={cn(
            "bg-tech-main absolute inset-y-0 left-0 transition-[width] duration-300",
            state === "success" ? "bg-green-600" : "",
            state === "error" ? "bg-red-500" : ""
          )}
          style={{ width: `${percent}%` }}
        />
        {state === "running" ? (
          <div className="animate-blueprint-sweep pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/70 to-transparent" />
        ) : null}
      </div>

      <ol
        className={cn(
          "relative mt-4 grid gap-2 sm:gap-3",
          compact ? "text-[0.625rem]" : "text-[0.6875rem]"
        )}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? "7rem" : "8rem"}, 1fr))`,
        }}>
        {stages.map((stage, index) => {
          const entry = timeline[index]
          const isCompleted =
            state === "success" ||
            index < stageIndex ||
            (state === "running" && displayProgress >= entry.endProgress - 0.01)
          const isCurrent = state === "running" && index === stageIndex
          const isErrored = state === "error" && index === stageIndex

          return (
            <li key={stage.id} className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "block size-2.5 shrink-0 border transition-all duration-300",
                    isErrored
                      ? "border-red-500 bg-red-500"
                      : isCompleted
                        ? "border-tech-main bg-tech-main"
                        : isCurrent
                          ? "border-tech-main/70 bg-tech-main/50 animate-pulse"
                          : "border-tech-main/25 bg-transparent"
                  )}
                />
                <span
                  className={cn(
                    "truncate font-mono tracking-widest uppercase",
                    isErrored
                      ? "text-red-600"
                      : isCompleted || isCurrent
                        ? "text-tech-main-dark"
                        : "text-tech-main/45"
                  )}>
                  {stage.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
