"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import {
  OperationProgress,
  type OperationProgressStage,
} from "@/components/ui/operation-progress"
import { MergeMethodPicker } from "@/components/review/merge-method-picker"
import { TechButton } from "@/components/ui/tech-button"
import { ActionForm } from "./action-form"
import type {
  ReviewMergeMethod,
  ReviewMergeStrategyAnalysis,
} from "@/types/review"

export function PRActionButtons({
  closePRAction,
  mergePRAction,
  mergeStrategyAnalysis,
  mergeBlockedReason,
  squashCommitDefaults,
}: {
  closePRAction: () => Promise<void>
  mergePRAction:
    | ((options: {
        commitBody?: string
        commitTitle?: string
        mergeMethod?: ReviewMergeMethod
      }) => Promise<void>)
    | null
  mergeStrategyAnalysis: ReviewMergeStrategyAnalysis
  mergeBlockedReason?: string | null
  squashCommitDefaults?: {
    title: string
    body: string
    coauthorLines: string[]
  }
}) {
  const resetKey = [
    mergeStrategyAnalysis.recommendation,
    squashCommitDefaults?.title ?? "",
    squashCommitDefaults?.body ?? "",
    squashCommitDefaults?.coauthorLines.join("\n") ?? "",
  ].join("::")

  return (
    <PRActionButtonsContent
      key={resetKey}
      closePRAction={closePRAction}
      mergePRAction={mergePRAction}
      mergeStrategyAnalysis={mergeStrategyAnalysis}
      mergeBlockedReason={mergeBlockedReason}
      squashCommitDefaults={squashCommitDefaults}
    />
  )
}

function PRActionButtonsContent({
  closePRAction,
  mergePRAction,
  mergeStrategyAnalysis,
  mergeBlockedReason,
  squashCommitDefaults,
}: {
  closePRAction: () => Promise<void>
  mergePRAction:
    | ((options: {
        commitBody?: string
        commitTitle?: string
        mergeMethod?: ReviewMergeMethod
      }) => Promise<void>)
    | null
  mergeStrategyAnalysis: ReviewMergeStrategyAnalysis
  mergeBlockedReason?: string | null
  squashCommitDefaults?: {
    title: string
    body: string
    coauthorLines: string[]
  }
}) {
  const t = useTranslations("OperationProgress")
  const reviewT = useTranslations("Review")
  const [selectedMethod, setSelectedMethod] = React.useState<ReviewMergeMethod>(
    mergeStrategyAnalysis.recommendation
  )
  const [commitTitle, setCommitTitle] = React.useState(
    squashCommitDefaults?.title ?? ""
  )
  const [commitBody, setCommitBody] = React.useState(
    squashCommitDefaults?.body ?? ""
  )

  const mergeStages = React.useMemo<OperationProgressStage[]>(
    () => [
      {
        id: "authorize",
        label: t("mergeStageAuthorize"),
        durationMs: 260,
      },
      {
        id: "github-api",
        label: t("mergeStageGithub"),
        durationMs: 920,
      },
      {
        id: "reconcile-assets",
        label: t("mergeStageAssets"),
        durationMs: 640,
      },
      {
        id: "refresh-views",
        label: t("mergeStageRefresh"),
        durationMs: 320,
      },
    ],
    [t]
  )

  const buildMergeOptions = React.useCallback(() => {
    const coauthorLines = squashCommitDefaults?.coauthorLines ?? []
    const finalBody =
      selectedMethod === "squash" &&
      coauthorLines.length > 0 &&
      !coauthorLines.some((line) => commitBody.includes(line))
        ? `${commitBody.trimEnd()}${commitBody.trim() ? "\n\n" : ""}${coauthorLines.join("\n")}`
        : commitBody

    return {
      mergeMethod: selectedMethod,
      ...(selectedMethod === "squash"
        ? { commitTitle, commitBody: finalBody }
        : {}),
    }
  }, [commitBody, commitTitle, selectedMethod, squashCommitDefaults])

  return (
    <div className="border-tech-main/35 space-y-4 border bg-white/80 p-4 backdrop-blur-sm">
      <div className="border-tech-main/15 space-y-1 border-b pb-3">
        <p className="text-tech-main/50 font-mono text-[0.6875rem] tracking-widest uppercase">
          {reviewT("mergeBoxLabel")}
        </p>
        <p className="text-tech-main font-mono text-sm font-bold tracking-widest uppercase">
          {mergePRAction ? reviewT("readyToLand") : reviewT("mergeBlocked")}
        </p>
        {mergeBlockedReason ? (
          <p className="font-mono text-[0.6875rem] leading-relaxed text-red-600">
            {mergeBlockedReason}
          </p>
        ) : null}
      </div>

      <MergeMethodPicker
        analysis={mergeStrategyAnalysis}
        selectedMethod={selectedMethod}
        onSelectMethod={setSelectedMethod}
        commitTitle={commitTitle}
        commitBody={commitBody}
        onCommitTitleChange={setCommitTitle}
        onCommitBodyChange={setCommitBody}
        coauthorLines={squashCommitDefaults?.coauthorLines}
        disabled={!mergePRAction}
        compact
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionForm action={closePRAction} className="flex-1">
          {({ isPending }) => (
            <TechButton
              type="submit"
              variant="secondary"
              disabled={isPending}
              className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
              {isPending ? "CLOSING..." : "CLOSE_PR"}
            </TechButton>
          )}
        </ActionForm>

        <ActionForm
          action={() =>
            mergePRAction?.(buildMergeOptions()) ?? Promise.resolve()
          }
          className="flex-1">
          {({ isPending, state }) => (
            <div className="space-y-3">
              <TechButton
                type="submit"
                variant="primary"
                disabled={isPending || !mergePRAction}
                aria-busy={isPending}
                className="w-full">
                {isPending ? reviewT("merging") : reviewT("confirmMerge")}
              </TechButton>

              <OperationProgress
                state={state}
                title={t("mergeTitle")}
                stages={mergeStages}
                successLabel={t("mergeSuccess")}
                errorLabel={t("mergeError")}
                compact
              />
            </div>
          )}
        </ActionForm>
      </div>
    </div>
  )
}
