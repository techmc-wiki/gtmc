"use client"

import * as React from "react"
import { AlertCircle, Loader2 } from "lucide-react"

import { createGlossaryDraftAction } from "@/actions/glossary-draft"
import { Button } from "@/components/ui/shadcn/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/shadcn/card"
import { useRouter } from "@/i18n/navigation"

interface NewGlossaryDraftStarterProps {
  prefillSlug?: string
}

const PENDING_DRAFT_TTL_MS = 5000
let pendingDraftCreation: {
  promise: Promise<{ id: string }>
  expiresAt: number
} | null = null

function getPendingDraftCreation(): Promise<{ id: string }> | null {
  if (!pendingDraftCreation) return null
  if (Date.now() < pendingDraftCreation.expiresAt) {
    return pendingDraftCreation.promise
  }
  pendingDraftCreation = null
  return null
}

export function NewGlossaryDraftStarter({
  prefillSlug,
}: NewGlossaryDraftStarterProps) {
  const router = useRouter()
  const inFlightRef = React.useRef(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const startDraft = React.useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const pending = getPendingDraftCreation()
      const creation = pending ?? createGlossaryDraftAction()
      if (!pending) {
        pendingDraftCreation = {
          promise: creation,
          expiresAt: Date.now() + PENDING_DRAFT_TTL_MS,
        }
      }
      const { id } = await creation
      const params = new URLSearchParams()
      if (prefillSlug) params.set("prefill", prefillSlug)
      const qs = params.toString()
      router.replace(`/glossary/edit/${id}${qs ? `?${qs}` : ""}`)
    } catch (error) {
      inFlightRef.current = false
      pendingDraftCreation = null
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create glossary draft"
      )
    }
  }, [prefillSlug, router])

  React.useEffect(() => {
    const startTimer = setTimeout(() => {
      void startDraft()
    }, 0)
    return () => {
      clearTimeout(startTimer)
    }
  }, [startDraft])
  return (
    <div className="page-container py-12">
      <Card className="border-border mx-auto max-w-md p-6 sm:p-8">
        <CardHeader className="p-0 pb-4 text-center">
          <CardTitle className="text-foreground text-base font-semibold">
            {errorMessage
              ? "Draft Initialization Failed"
              : "Initializing Glossary Draft"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 text-center">
          {errorMessage ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex w-full items-center gap-2 bg-red-500/10 p-3 text-left text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => void startDraft()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="text-tech-signal size-6 animate-spin" />
              <p className="text-muted-foreground text-xs">
                Creating your workspace, please wait…
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
