"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { TechButton } from "@/components/ui/tech-button"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { MergeMethodPicker } from "@/components/review/merge-method-picker"
import {
  OperationProgress,
  type OperationProgressStage,
  type OperationProgressState,
} from "@/components/ui/operation-progress"
import type { FileRebaseState, RebaseState } from "@/types/rebase"
import type {
  ReviewMergeMethod,
  ReviewMergeStrategyAnalysis,
} from "@/types/review"

interface SimpleFileStatus {
  filePath: string
  status: "clean" | "conflict" | "resolved"
}

interface RebaseProgressProps {
  mode: "FINE_GRAINED" | "SIMPLE"
  rebaseState?: RebaseState | null
  files?: SimpleFileStatus[]
  isBranchSyncing?: boolean
  onAbort: () => void
  onFinalize: (options?: {
    commitTitle?: string
    commitBody?: string
    mergeMethod?: ReviewMergeMethod
  }) => void
  isAborting?: boolean
  isFinalizing?: boolean
  finalizeProgressState?: OperationProgressState
  defaultCommitTitle?: string
  defaultCommitBody?: string
  coauthorLines?: string[]
  mergeStrategyAnalysis: ReviewMergeStrategyAnalysis
}

function CommitStepDots({
  commitInfos,
  currentCommitIndex,
  status,
}: {
  commitInfos: RebaseState["commitInfos"]
  currentCommitIndex: number
  status?: RebaseState["status"]
}) {
  const total = commitInfos.length
  if (total === 0) return null

  const visibleCommits = commitInfos.slice(0, 10)
  const overflowCount = total - visibleCommits.length

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleCommits.map((commit, index) => {
        const isDone =
          status === "COMPLETED" ? true : index < currentCommitIndex
        const isCurrent = index === currentCommitIndex
        const isConflict = isCurrent && status === "CONFLICT"
        const isInProgress = isCurrent && status === "IN_PROGRESS"

        return (
          <React.Fragment key={commit.sha}>
            <span
              title={`Commit ${index + 1}: ${commit.sha.slice(0, 7)}`}
              className={`block size-2 border transition-all duration-300 ${
                isConflict
                  ? "border-red-500 bg-red-500"
                  : isDone
                    ? "border-tech-main bg-tech-main"
                    : isInProgress
                      ? "animate-pulse border-tech-main/70 bg-tech-main/70"
                      : "border-tech-main/30 bg-transparent"
              }`}
            />
            {index < visibleCommits.length - 1 ? (
              <span className="h-px w-3 bg-tech-main/20" aria-hidden="true" />
            ) : null}
          </React.Fragment>
        )
      })}
      {overflowCount > 0 ? (
        <span className="ml-1 font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
          +{overflowCount}
        </span>
      ) : null}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "conflict"
      ? "bg-red-400"
      : status === "resolved" || status === "completed"
        ? "bg-green-500"
        : status === "in_progress"
          ? "bg-yellow-400"
          : "bg-tech-main/30"
  return <span className={`inline-block size-2 shrink-0 ${color}`} />
}

function CurrentCommitPanel({
  commitSha,
  commitMessage,
  commitAuthor,
  fileStates,
}: {
  commitSha?: string
  commitMessage?: string
  commitAuthor?: string
  fileStates: FileRebaseState[]
}) {
  if (!commitSha && !commitMessage && fileStates.length === 0) {
    return null
  }

  return (
    <div className="relative space-y-3 border border-tech-main/30 bg-white/70 p-3">
      <CornerBrackets color="border-tech-main/20" />
      <div className="space-y-1">
        <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
          CURRENT_COMMIT
        </p>
        {commitSha ? (
          <p className="font-mono text-sm font-bold tracking-widest text-tech-main uppercase">
            SHA_{commitSha.slice(0, 7)}_
          </p>
        ) : null}
        {commitMessage ? (
          <p className="font-mono text-xs/relaxed text-tech-main/80">
            {commitMessage}
          </p>
        ) : null}
        {commitAuthor ? (
          <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/40 uppercase">
            {commitAuthor}
          </p>
        ) : null}
      </div>

      {fileStates.length > 0 ? (
        <div className="space-y-1">
          <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
            FILE_STATES
          </p>
          <ul className="space-y-1">
            {fileStates.map((fs) => (
              <li
                key={fs.filePath}
                className="flex items-center gap-2 font-mono text-[0.6875rem] text-tech-main/70">
                <StatusDot status={fs.status} />
                <span className="truncate">{fs.filePath}</span>
                <span className="ml-auto shrink-0 tracking-widest text-tech-main/40 uppercase">
                  {fs.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function AbortButton({
  onAbort,
  isAborting,
}: {
  onAbort: () => void
  isAborting?: boolean
}) {
  const t = useTranslations("Review")
  const editorT = useTranslations("Editor")
  const [confirming, setConfirming] = React.useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.6875rem] tracking-widest text-red-400 uppercase">
          {t("confirmAbort")}
        </span>
        <TechButton
          variant="danger"
          size="sm"
          disabled={isAborting}
          onClick={() => {
            setConfirming(false)
            onAbort()
          }}>
          {isAborting ? t("aborting") : t("yesAbort")}
        </TechButton>
        <TechButton
          variant="secondary"
          size="sm"
          onClick={() => setConfirming(false)}>
          {editorT("cancelButton")}
        </TechButton>
      </div>
    )
  }

  return (
    <TechButton
      variant="danger"
      size="sm"
      disabled={isAborting}
      onClick={() => setConfirming(true)}>
      {t("abortResolution")}
    </TechButton>
  )
}

export function RebaseProgress({
  mode,
  rebaseState,
  files,
  isBranchSyncing = false,
  onAbort,
  onFinalize,
  isAborting,
  isFinalizing,
  finalizeProgressState = "idle",
  defaultCommitTitle = "",
  defaultCommitBody = "",
  coauthorLines = [],
  mergeStrategyAnalysis,
}: RebaseProgressProps) {
  const t = useTranslations("Review")
  const progressT = useTranslations("OperationProgress")
  const [commitTitle, setCommitTitle] = React.useState(defaultCommitTitle)
  const [commitBody, setCommitBody] = React.useState(defaultCommitBody)
  const [selectedMethod, setSelectedMethod] = React.useState<ReviewMergeMethod>(
    mergeStrategyAnalysis.recommendation
  )

  const finalizeStages = React.useMemo<OperationProgressStage[]>(
    () =>
      mode === "FINE_GRAINED"
        ? [
            {
              id: "validate",
              label: progressT("finalizeStageValidate"),
              durationMs: 240,
            },
            {
              id: "push-branch",
              label: progressT("finalizeStagePush"),
              durationMs: 920,
            },
            {
              id: "merge-pr",
              label: progressT("finalizeStageMerge"),
              durationMs: 720,
            },
            {
              id: "assets",
              label: progressT("finalizeStageAssets"),
              durationMs: 520,
            },
            {
              id: "refresh",
              label: progressT("finalizeStageRefresh"),
              durationMs: 300,
            },
          ]
        : [
            {
              id: "validate",
              label: progressT("finalizeStageValidate"),
              durationMs: 240,
            },
            {
              id: "merge-pr",
              label: progressT("finalizeStageMerge"),
              durationMs: 920,
            },
            {
              id: "assets",
              label: progressT("finalizeStageAssets"),
              durationMs: 520,
            },
            {
              id: "refresh",
              label: progressT("finalizeStageRefresh"),
              durationMs: 300,
            },
          ],
    [mode, progressT]
  )

  React.useEffect(() => {
    setCommitTitle(defaultCommitTitle)
  }, [defaultCommitTitle])

  React.useEffect(() => {
    setCommitBody(defaultCommitBody)
  }, [defaultCommitBody])

  React.useEffect(() => {
    setSelectedMethod(mergeStrategyAnalysis.recommendation)
  }, [mergeStrategyAnalysis])

  const buildFinalizeOptions = React.useCallback(() => {
    const finalBody =
      selectedMethod === "squash" &&
      coauthorLines.length > 0 &&
      !coauthorLines.some((line) => commitBody.includes(line))
        ? `${commitBody.trimEnd()}${commitBody.trim() ? "\n\n" : ""}${coauthorLines.join("\n")}`
        : commitBody

    return {
      mergeMethod: selectedMethod,
      ...(selectedMethod === "squash"
        ? {
            commitTitle,
            commitBody: finalBody,
          }
        : {}),
    }
  }, [coauthorLines, commitBody, commitTitle, selectedMethod])

  if (mode === "FINE_GRAINED") {
    const total = rebaseState?.commitShas.length ?? 0
    const isCompleted = rebaseState?.status === "COMPLETED"
    const current = isCompleted
      ? total
      : Math.min((rebaseState?.currentCommitIndex ?? 0) + 1, total)
    const currentCommitIndex = rebaseState?.currentCommitIndex ?? 0
    const currentInfo =
      rebaseState?.commitInfos[
        Math.min(
          currentCommitIndex,
          Math.max((rebaseState?.commitInfos.length ?? 1) - 1, 0)
        )
      ]
    const fileStates = rebaseState?.fileStates
      ? Object.values(rebaseState.fileStates)
      : []
    const conflictFile = fileStates.find((fs) => fs.status === "conflict")
    const currentCommitSha =
      rebaseState?.conflictedCommitSha ??
      currentInfo?.sha ??
      rebaseState?.commitShas[currentCommitIndex]

    return (
      <div className="space-y-4 border border-tech-main/40 bg-tech-main/5 p-4">
        <OperationProgress
          state={finalizeProgressState}
          title={progressT("finalizeTitle")}
          stages={finalizeStages}
          successLabel={progressT("finalizeSuccess")}
          errorLabel={progressT("finalizeError")}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
              PROGRESS
            </p>
            <p className="font-mono text-sm font-bold tracking-widest text-tech-main uppercase">
              RESOLVING_COMMIT_{current}_OF_{total}_
            </p>
            <CommitStepDots
              commitInfos={rebaseState?.commitInfos ?? []}
              currentCommitIndex={currentCommitIndex}
              status={rebaseState?.status}
            />
          </div>

          <div className="flex min-w-32 items-center gap-2">
            <div className="relative h-1 flex-1 bg-tech-main/20">
              <div
                className="absolute inset-y-0 left-0 bg-tech-main transition-all duration-500"
                style={{
                  width: `${total > 0 ? Math.min((current / total) * 100, 100) : 0}%`,
                }}
              />
            </div>
            <span className="font-mono text-[0.6875rem] text-tech-main/60 tabular-nums">
              {current}/{total}
            </span>
          </div>
        </div>

        {rebaseState?.status === "CONFLICT" && currentCommitSha ? (
          <div className="border border-red-500 bg-red-500/5 p-3">
            <p className="font-mono text-[0.6875rem] font-bold tracking-widest text-red-600 uppercase">
              CONFLICT_DETECTED_IN_COMMIT_{currentCommitSha.slice(0, 7)}_
            </p>
            {conflictFile ? (
              <p className="mt-2 font-mono text-[0.6875rem] tracking-widest text-red-500 uppercase">
                FILE_{conflictFile.filePath}_
              </p>
            ) : null}
          </div>
        ) : null}

        <CurrentCommitPanel
          commitSha={currentCommitSha}
          commitMessage={currentInfo?.message}
          commitAuthor={currentInfo?.author}
          fileStates={fileStates}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <AbortButton onAbort={onAbort} isAborting={isAborting} />
          {isCompleted && (
            <TechButton
              variant="primary"
              size="md"
              disabled={isFinalizing}
              className="border-green-700! bg-green-700! hover:bg-green-800!"
              onClick={() => onFinalize(buildFinalizeOptions())}>
              {isFinalizing ? t("finalizing") : t("finalizeAndMerge")}
            </TechButton>
          )}
        </div>

        {isCompleted ? (
          <MergeMethodPicker
            analysis={mergeStrategyAnalysis}
            selectedMethod={selectedMethod}
            onSelectMethod={setSelectedMethod}
            commitTitle={commitTitle}
            commitBody={commitBody}
            onCommitTitleChange={setCommitTitle}
            onCommitBodyChange={setCommitBody}
            coauthorLines={coauthorLines}
            disabled={isFinalizing}
            compact
          />
        ) : null}
      </div>
    )
  }

  const conflictFiles = (files ?? []).filter((f) => f.status === "conflict")
  const allResolved = conflictFiles.length === 0
  const totalFiles = files?.length ?? 0

  return (
    <div className="space-y-4 border border-tech-main/40 bg-tech-main/5 p-4">
      <OperationProgress
        state={finalizeProgressState}
        title={progressT("finalizeTitle")}
        stages={finalizeStages}
        successLabel={progressT("finalizeSuccess")}
        errorLabel={progressT("finalizeError")}
      />

      <div className="space-y-1">
        <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
          PROGRESS
        </p>
        <p className="font-mono text-sm font-bold tracking-widest text-tech-main uppercase">
          RESOLVING_CONFLICTS_IN_{conflictFiles.length}_FILES_
        </p>
        <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/60 uppercase">
          {isBranchSyncing ? "PR_BRANCH_UPDATING_" : "PR_BRANCH_SYNCED_"}
        </p>
      </div>

      {(files ?? []).length > 0 && (
        <ul className="space-y-1">
          {(files ?? []).map((f) => (
            <li
              key={f.filePath}
              className="flex items-center gap-2 font-mono text-[0.6875rem] text-tech-main/70">
              <StatusDot status={f.status} />
              <span className="truncate">{f.filePath}</span>
              <span className="ml-auto shrink-0 tracking-widest text-tech-main/40 uppercase">
                {f.status.toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {allResolved && !isBranchSyncing ? (
        <MergeMethodPicker
          analysis={mergeStrategyAnalysis}
          selectedMethod={selectedMethod}
          onSelectMethod={setSelectedMethod}
          commitTitle={commitTitle}
          commitBody={commitBody}
          onCommitTitleChange={setCommitTitle}
          onCommitBodyChange={setCommitBody}
          coauthorLines={coauthorLines}
          disabled={isFinalizing}
          compact
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <AbortButton onAbort={onAbort} isAborting={isAborting} />
        {allResolved && !isBranchSyncing && (
          <TechButton
            variant="primary"
            size="sm"
            disabled={isFinalizing}
            className="border-green-700! bg-green-700! hover:bg-green-800!"
            onClick={() => onFinalize(buildFinalizeOptions())}>
            {isFinalizing ? t("finalizing") : t("finalizeAndMerge")}
          </TechButton>
        )}
      </div>
    </div>
  )
}
