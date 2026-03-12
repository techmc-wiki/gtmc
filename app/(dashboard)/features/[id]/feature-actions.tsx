"use client"

import { useTransition } from "react"
import { BrutalButton } from "@/components/ui/brutal-button"
import { assignFeature, unassignFeature, resolveFeature } from "@/actions/feature"

interface Props {
  featureId: string
  status: string
  isAssignee: boolean
  isAdmin: boolean
  hasAssignee: boolean
}

export function FeatureActions({ featureId, status, isAssignee, isAdmin, hasAssignee }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleAssign = () => {
    startTransition(async () => {
      await assignFeature(featureId)
    })
  }

  const handleUnassign = () => {
    startTransition(async () => {
      await unassignFeature(featureId)
    })
  }

  const handleResolve = () => {
    const comment = window.prompt("Resolution comment (optional):")
    if (comment === null) return // cancelled
    
    startTransition(async () => {
      await resolveFeature(featureId, comment)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "RESOLVED" && (
        <>
          {!hasAssignee && (
            <BrutalButton onClick={handleAssign} disabled={isPending} variant="secondary" size="sm">
              CLAIM ISSUE
            </BrutalButton>
          )}

          {isAssignee && (
            <BrutalButton onClick={handleUnassign} disabled={isPending} variant="ghost" size="sm">
              DROP ISSUE
            </BrutalButton>
          )}

          {isAdmin && (
            <BrutalButton onClick={handleResolve} disabled={isPending} variant="primary" size="sm" className="bg-green-600 hover:bg-green-700 text-white border-green-800">
              MARK AS RESOLVED
            </BrutalButton>
          )}
        </>
      )}
    </div>
  )
}