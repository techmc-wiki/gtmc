"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { TechButton } from "@/components/ui/tech-button"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import type { FileRebaseState, RebaseState } from "@/types/rebase"

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
  onFinalize: (options?: { commitTitle?: string; commitBody?: string }) => void
  isAborting?: boolean
  isFinalizing?: boolean
  defaultCommitTitle?: string
  defaultCommitBody?: string
  coauthorLines?: string[]
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
  const [confirming, setConfirming] = React.useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.6875rem] tracking-widest text-red-400 uppercase">
          CONFIRM_ABORT?
        </span>
        <TechButton
          variant="danger"
          size="sm"
          disabled={isAborting}
          onClick={() => {
            setConfirming(false)
            onAbort()
          }}>
          {isAborting ? "ABORTING..." : "YES, ABORT"}
        </TechButton>
        <TechButton
          variant="secondary"
          size="sm"
          onClick={() => setConfirming(false)}>
          CANCEL
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
      ABORT RESOLUTION
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
  defaultCommitTitle = "",
  defaultCommitBody = "",
  coauthorLines = [],
}: RebaseProgressProps) {
  const t = useTranslations("Review")
  const [showCommitEditor, setShowCommitEditor] = React.useState(false)
  const [commitTitle, setCommitTitle] = React.useState(defaultCommitTitle)
  const [commitBody, setCommitBody] = React.useState(defaultCommitBody)

  React.useEffect(() => {
    setCommitTitle(defaultCommitTitle)
  }, [defaultCommitTitle])

  React.useEffect(() => {
    setCommitBody(defaultCommitBody)
  }, [defaultCommitBody])

  React.useEffect(() => {
    if (isBranchSyncing) {
      setShowCommitEditor(false)
    }
  }, [isBranchSyncing])

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
              onClick={() => onFinalize()}>
              {isFinalizing ? "FINALIZING..." : "FINALIZE & MERGE"}
            </TechButton>
          )}
        </div>
      </div>
    )
  }

  const conflictFiles = (files ?? []).filter((f) => f.status === "conflict")
  const allResolved = conflictFiles.length === 0
  const totalFiles = files?.length ?? 0

  return (
    <div className="space-y-4 border border-tech-main/40 bg-tech-main/5 p-4">
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

      {showCommitEditor && (
        <div className="relative space-y-3 border border-tech-main/30 bg-white/80 p-4">
          <CornerBrackets color="border-tech-main/30" />
          <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/60 uppercase">
            {t("squashCommitMessage")}
          </p>

          <div className="space-y-1">
            <label
              htmlFor="commit-title"
              className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
              {t("commitTitleLabel")}
            </label>
            <input
              id="commit-title"
              type="text"
              value={commitTitle}
              onChange={(e) => setCommitTitle(e.target.value)}
              className="
                w-full border border-tech-main/30 bg-white px-3 py-2
                font-mono text-xs text-tech-main placeholder:text-tech-main/30
                focus:border-tech-main focus:outline-none
              "
              placeholder={t("commitTitlePlaceholder")}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="commit-body"
              className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
              {t("commitBodyLabel")}
            </label>
            <textarea
              id="commit-body"
              value={commitBody}
              onChange={(e) => setCommitBody(e.target.value)}
              rows={4}
              className="
                w-full resize-y border border-tech-main/30 bg-white px-3
                py-2 font-mono text-xs text-tech-main
                placeholder:text-tech-main/30 focus:border-tech-main focus:outline-none
              "
              placeholder={t("commitBodyPlaceholder")}
            />
          </div>

          {coauthorLines.length > 0 && (
            <div className="space-y-1">
              <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
                {t("coauthorsReadonly")}
              </p>
              <pre className="overflow-x-auto border guide-line bg-tech-main/5 px-3 py-2 font-mono text-[0.6875rem] text-tech-main/60">
                {coauthorLines.join("\n")}
              </pre>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <TechButton
              variant="secondary"
              size="sm"
              onClick={() => setShowCommitEditor(false)}>
              CANCEL
            </TechButton>
            <TechButton
              variant="primary"
              size="sm"
              disabled={isBranchSyncing || isFinalizing}
              className="border-green-700! bg-green-700! hover:bg-green-800!"
              onClick={() => {
                const finalBody =
                  coauthorLines.length > 0 &&
                  !coauthorLines.some((line) => commitBody.includes(line))
                    ? commitBody.trimEnd() + "\n\n" + coauthorLines.join("\n")
                    : commitBody
                onFinalize({ commitTitle, commitBody: finalBody })
              }}>
              {isFinalizing ? "MERGING..." : "CONFIRM MERGE"}
            </TechButton>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <AbortButton onAbort={onAbort} isAborting={isAborting} />
        {allResolved && !isBranchSyncing && !showCommitEditor && (
          <TechButton
            variant="primary"
            size="sm"
            disabled={isFinalizing}
            className="border-green-700! bg-green-700! hover:bg-green-800!"
            onClick={() => setShowCommitEditor(true)}>
            {isFinalizing ? "FINALIZING..." : "FINALIZE & MERGE"}
          </TechButton>
        )}
      </div>
    </div>
  )
}
