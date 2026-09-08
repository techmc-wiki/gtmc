"use client"

import * as React from "react"

import { cn } from "@/lib/cn"

export type OperationProgressState = "idle" | "running" | "success" | "error"

interface OperationProgressStage {
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

const MIN_VISIBLE_PROGRESS = 0.06
const RUNNING_PROGRESS_LIMIT = 0.94
const SPRING_STIFFNESS = 16
const SPRING_DAMPING = 10

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface StageTimelineEntry extends OperationProgressStage {
  endMs: number
  endProgress: number
  startMs: number
  startProgress: number
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
  const stageElapsed = Math.min(
    Math.max((elapsedMs - activeStage.startMs) / stageDuration, 0),
    1
  )
  const easedElapsed = 1 - Math.pow(1 - stageElapsed, 3)

  return (
    activeStage.startProgress +
    (activeStage.endProgress - activeStage.startProgress) * easedElapsed
  )
}

function getStageIndex(elapsedMs: number, timeline: StageTimelineEntry[]) {
  if (timeline.length === 0) return 0
  const index = timeline.findIndex((stage) => elapsedMs < stage.endMs)
  return index === -1 ? timeline.length - 1 : index
}

function getStageMarkerClassName({
  isCompleted,
  isCurrent,
  isErrored,
}: {
  isCompleted: boolean
  isCurrent: boolean
  isErrored: boolean
}) {
  if (isErrored) return "border-red-500 bg-red-500"
  if (isCompleted) return "border-tech-main bg-tech-main"
  if (isCurrent) {
    return "border-tech-main/70 bg-tech-main/50 animate-pulse motion-reduce:animate-none"
  }
  return "border-tech-main/25 bg-transparent"
}

function getStageLabelClassName({
  isCompleted,
  isCurrent,
  isErrored,
}: {
  isCompleted: boolean
  isCurrent: boolean
  isErrored: boolean
}) {
  if (isErrored) return "text-red-600"
  if (isCompleted || isCurrent) return "text-tech-main-dark"
  return "text-tech-main/45"
}

function ProgressStatus({
  percent,
  state,
  statusLabel,
  title,
}: {
  percent: number
  state: OperationProgressState
  statusLabel: string
  title: string
}) {
  return (
    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <p className="text-tech-main/50 text-[0.6875rem]">{title}</p>
        <p
          className={cn(
            "text-[0.75rem]",
            state === "success"
              ? "text-green-600"
              : state === "error"
                ? "text-red-600"
                : "text-tech-main-dark"
          )}>
          {statusLabel}
        </p>
      </div>

      <div className="guide-line text-tech-main/70 bg-surface-overlay/70 shrink-0 border px-2 py-1 text-[0.6875rem]">
        {percent.toString().padStart(2, "0")}%
      </div>
    </div>
  )
}

function ProgressBar({
  percent,
  state,
  title,
}: {
  percent: number
  state: OperationProgressState
  title: string
}) {
  return (
    <progress
      className={cn(
        "mt-3 block h-2 w-full appearance-none overflow-hidden bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary",
        state === "success" &&
          "[&::-webkit-progress-value]:bg-green-600 [&::-moz-progress-bar]:bg-green-600",
        state === "error" &&
          "[&::-webkit-progress-value]:bg-destructive [&::-moz-progress-bar]:bg-destructive"
      )}
      aria-label={title}
      max={100}
      value={percent}
    />
  )
}

function ProgressStage({
  displayProgress,
  entry,
  index,
  stage,
  stageIndex,
  state,
}: {
  displayProgress: number
  entry: StageTimelineEntry
  index: number
  stage: OperationProgressStage
  stageIndex: number
  state: OperationProgressState
}) {
  const isCompleted =
    state === "success" ||
    index < stageIndex ||
    (state === "running" && displayProgress >= entry.endProgress - 0.01)
  const isCurrent = state === "running" && index === stageIndex
  const isErrored = state === "error" && index === stageIndex
  const status = { isCompleted, isCurrent, isErrored }

  return (
    <li className="min-w-0">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "block size-2.5 shrink-0 border transition-colors duration-300",
            getStageMarkerClassName(status)
          )}
        />
        <span className={cn("truncate ", getStageLabelClassName(status))}>
          {stage.label}
        </span>
      </div>
    </li>
  )
}

function ProgressStages({
  compact,
  displayProgress,
  stageIndex,
  stages,
  state,
  style,
  timeline,
}: {
  compact: boolean
  displayProgress: number
  stageIndex: number
  stages: OperationProgressStage[]
  state: OperationProgressState
  style: React.CSSProperties
  timeline: StageTimelineEntry[]
}) {
  return (
    <ol
      className={cn(
        "relative mt-4 grid gap-2 sm:gap-3",
        compact ? "text-[0.625rem]" : "text-[0.6875rem]"
      )}
      style={style}>
      {stages.map((stage, index) => (
        <ProgressStage
          key={stage.id}
          displayProgress={displayProgress}
          entry={timeline[index]}
          index={index}
          stage={stage}
          stageIndex={stageIndex}
          state={state}
        />
      ))}
    </ol>
  )
}

interface ProgressDisplayProps {
  className?: string
  compact: boolean
  displayProgress: number
  percent: number
  stageGridStyle: React.CSSProperties
  stageIndex: number
  stages: OperationProgressStage[]
  state: OperationProgressState
  statusLabel: string
  timeline: StageTimelineEntry[]
  title: string
}

function ProgressDisplay({
  className,
  compact,
  displayProgress,
  percent,
  stageGridStyle,
  stageIndex,
  stages,
  state,
  statusLabel,
  timeline,
  title,
}: ProgressDisplayProps) {
  return (
    <output
      className={cn(
        "guide-line bg-surface-overlay/85 relative block overflow-hidden border backdrop-blur-sm",
        compact ? "p-3" : "p-4",
        state === "error" ? "border-red-500/30 bg-red-500/5" : "",
        className
      )}
      aria-live="polite">
      <ProgressStatus
        percent={percent}
        state={state}
        statusLabel={statusLabel}
        title={title}
      />
      <ProgressBar percent={percent} state={state} title={title} />
      <ProgressStages
        compact={compact}
        displayProgress={displayProgress}
        stageIndex={stageIndex}
        stages={stages}
        state={state}
        style={stageGridStyle}
        timeline={timeline}
      />
    </output>
  )
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

  const percent = Math.round(displayProgress * 100)
  const stageGridStyle = React.useMemo(
    (): React.CSSProperties => ({
      gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? "7rem" : "8rem"}, 1fr))`,
    }),
    [compact]
  )

  if (state === "idle" || stages.length === 0) {
    return null
  }

  const activeStage =
    stages[Math.min(stageIndex, Math.max(stages.length - 1, 0))]
  const statusLabel =
    state === "success"
      ? successLabel
      : state === "error"
        ? errorLabel
        : activeStage?.label || title

  return (
    <ProgressDisplay
      className={className}
      compact={compact}
      displayProgress={displayProgress}
      percent={percent}
      stageGridStyle={stageGridStyle}
      stageIndex={stageIndex}
      stages={stages}
      state={state}
      statusLabel={statusLabel}
      timeline={timeline}
      title={title}
    />
  )
}
