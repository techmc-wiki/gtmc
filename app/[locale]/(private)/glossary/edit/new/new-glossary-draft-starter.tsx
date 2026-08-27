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

let pendingDraftCreation: Promise<{ id: string }> | null = null
let clearPendingDraftCreation: ReturnType<typeof setTimeout> | null = null

export function NewGlossaryDraftStarter({
  prefillSlug,
}: NewGlossaryDraftStarterProps) {
  const router = useRouter()
  const inFlightRef = React.useRef(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const startDraft = React.useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setErrorMessage(null)
    try {
      const creation = pendingDraftCreation ?? createGlossaryDraftAction()
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (clearPendingDraftCreation) {
        clearTimeout(clearPendingDraftCreation)
        clearPendingDraftCreation = null
      }
      pendingDraftCreation = creation
      const { id } = await creation
      const params = new URLSearchParams()
      if (prefillSlug) params.set("prefill", prefillSlug)
      const qs = params.toString()
      router.replace(`/glossary/edit/${id}${qs ? `?${qs}` : ""}`)
      const timer = setTimeout(() => {
        if (pendingDraftCreation === creation) {
          pendingDraftCreation = null
        }
        timerRef.current = null
        clearPendingDraftCreation = null
      }, 5000)
      timerRef.current = timer
      clearPendingDraftCreation = timer
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
    void startDraft()
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (clearPendingDraftCreation !== null) {
        clearTimeout(clearPendingDraftCreation)
        clearPendingDraftCreation = null
      }
    }
  }, [startDraft])
  return (
    <div className="page-container py-12">
      <Card
        tone="main"
        borderOpacity="subtle"
        background="default"
        padding="spacious"
        brackets="hidden"
        hover="none"
        className="border-border mx-auto max-w-md">
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
