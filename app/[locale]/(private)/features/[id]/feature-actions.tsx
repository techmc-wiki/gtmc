"use client"

import { useTranslations } from "next-intl"
import { useTransition, useState } from "react"
import { TechButton } from "@/components/ui/tech-button"
import {
  assignFeature,
  unassignFeature,
  resolveFeature,
} from "@/actions/feature"
import { LoadingIndicator, PENDING_LABELS } from "../loading-indicator"

interface Props {
  featureId: string
  status: string
  isAssignee: boolean
  isAdmin: boolean
  hasAssignee: boolean
}

export function FeatureActions({
  featureId,
  status,
  isAssignee,
  isAdmin,
  hasAssignee,
}: Props) {
  const t = useTranslations("Feature")
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<
    "assign" | "unassign" | "resolve" | null
  >(null)

  const handleAssign = () => {
    setPendingAction("assign")
    startTransition(async () => {
      await assignFeature(featureId)
      setPendingAction(null)
    })
  }

  const handleUnassign = () => {
    setPendingAction("unassign")
    startTransition(async () => {
      await unassignFeature(featureId)
      setPendingAction(null)
    })
  }

  const handleResolve = () => {
    const comment = window.prompt(t("statusUpdatePrompt"))
    if (comment === null) return // cancelled

    setPendingAction("resolve")
    startTransition(async () => {
      await resolveFeature(featureId, comment)
      setPendingAction(null)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "RESOLVED" && (
        <>
          {!hasAssignee && (
            <div>
              <TechButton
                onClick={handleAssign}
                disabled={isPending}
                variant="secondary"
                size="sm"
                aria-busy={pendingAction === "assign"}>
                {pendingAction === "assign" ? (
                  <LoadingIndicator label={PENDING_LABELS.CLAIMING_ISSUE} />
                ) : (
                  t("claimIssue")
                )}
              </TechButton>
            </div>
          )}

          {isAssignee && (
            <div>
              <TechButton
                onClick={handleUnassign}
                disabled={isPending}
                variant="secondary"
                size="sm"
                aria-busy={pendingAction === "unassign"}>
                {pendingAction === "unassign" ? (
                  <LoadingIndicator label={PENDING_LABELS.DROPPING_ISSUE} />
                ) : (
                  t("dropIssue")
                )}
              </TechButton>
            </div>
          )}

          {isAdmin && (
            <div>
              <TechButton
                onClick={handleResolve}
                disabled={isPending}
                variant="primary"
                size="sm"
                className="border-green-800 bg-green-600 text-white hover:bg-green-700"
                aria-busy={pendingAction === "resolve"}>
                {pendingAction === "resolve" ? (
                  <LoadingIndicator label={PENDING_LABELS.RESOLVING_ISSUE} />
                ) : (
                  t("markResolved")
                )}
              </TechButton>
            </div>
          )}
        </>
      )}
    </div>
  )
}
