"use client"

import { TechButton } from "@/components/ui/tech-button"
import { ActionForm } from "./action-form"

export function PRActionButtons({
  closePRAction,
  mergePRAction,
}: {
  closePRAction: () => Promise<void>
  mergePRAction: (() => Promise<void>) | null
}) {
  return (
    <div className="flex w-full gap-4 md:w-auto">
      <ActionForm action={closePRAction}>
        {(isPending) => (
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
        <ActionForm action={mergePRAction}>
          {(isPending) => (
            <TechButton
              type="submit"
              variant="primary"
              disabled={isPending}
              className="w-full">
              {isPending ? "MERGING..." : "APPROVE_&_MERGE"}
            </TechButton>
          )}
        </ActionForm>
      )}
    </div>
  )
}
