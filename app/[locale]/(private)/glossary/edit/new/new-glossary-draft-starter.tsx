"use client"

import * as React from "react"

import { createGlossaryDraftAction } from "@/actions/glossary-draft"
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
  const [error, setError] = React.useState<string | null>(null)

  const startDraft = React.useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setError(null)

    try {
      const creation = pendingDraftCreation ?? createGlossaryDraftAction()
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
      clearPendingDraftCreation = setTimeout(() => {
        if (pendingDraftCreation === creation) {
          pendingDraftCreation = null
        }
        clearPendingDraftCreation = null
      }, 5000)
      // eslint-disable-next-line no-shadow, unicorn/catch-error-name -- catch param must match outer state name
    } catch (error) {
      inFlightRef.current = false
      pendingDraftCreation = null
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create glossary draft"
      )
    }
  }, [prefillSlug, router])

  React.useEffect(() => {
    void startDraft()
  }, [startDraft])

  return (
    <div className="page-container">
      <div className="border-tech-main/40 bg-surface-overlay/80 p-6 font-mono backdrop-blur-sm">
        <p className="text-tech-main/60 text-[10px] tracking-widest uppercase">
          [GLOSSARY_DRAFT_INITIALIZATION]
        </p>
        <p className="text-tech-main-dark mt-3 text-sm tracking-wide uppercase">
          {error ? "Creation failed." : "Creating glossary draft..."}
        </p>
        {error ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-red-700 normal-case">{error}</p>
            <button
              type="button"
              onClick={() => void startDraft()}
              className="border-tech-main bg-tech-main hover:bg-tech-main-dark w-fit cursor-pointer border px-4 py-2 text-xs font-bold tracking-widest text-white uppercase transition-colors">
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
