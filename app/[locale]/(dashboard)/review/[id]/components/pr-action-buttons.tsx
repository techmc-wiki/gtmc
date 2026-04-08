"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import {
  OperationProgress,
  type OperationProgressStage,
} from "@/components/ui/operation-progress"
import { TechButton } from "@/components/ui/tech-button"
import { ActionForm } from "./action-form"

export function PRActionButtons({
  closePRAction,
  mergePRAction,
}: {
  closePRAction: () => Promise<void>
  mergePRAction: (() => Promise<void>) | null
}) {
  const t = useTranslations("OperationProgress")
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

  return (
    <div className="flex w-full gap-4 md:w-auto md:min-w-[30rem]">
      <ActionForm action={closePRAction} className="flex-1">
        {({ isPending }) => (
          <TechButton
            type="submit"
            variant="secondary"
            disabled={isPending}
            className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
            {isPending ? "CLOSING..." : "CLOSE"}
          </TechButton>
        )}
      </ActionForm>
      {mergePRAction && (
        <ActionForm action={mergePRAction} className="flex-1">
          {({ isPending, state }) => (
            <div className="space-y-3">
              <TechButton
                type="submit"
                variant="primary"
                disabled={isPending}
                aria-busy={isPending}
                className="w-full">
                {isPending ? "MERGING..." : "APPROVE_&_MERGE"}
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
      )}
    </div>
  )
}
