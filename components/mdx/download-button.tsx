import * as React from "react"
import { Button } from "@/components/ui/shadcn/button"

/** Primary download button wired to the R2-hosted PDF asset. */
export function DownloadButton({
  filename,
  unavailableNote,
  children,
}: {
  filename: string
  unavailableNote: React.ReactNode
  children: React.ReactNode
}) {
  const baseUrl = process.env.NEXT_PUBLIC_PDF_BASE_URL?.trim().replace(
    /\/+$/,
    ""
  )

  if (!baseUrl) {
    return (
      <div className="space-y-2">
        <Button
          variant="primary"
          size="md"
          className="w-full sm:w-auto"
          disabled
          aria-disabled="true">
          {children}
        </Button>
        <p className="text-tech-main/60 font-mono text-xs tracking-wide">
          {unavailableNote}
        </p>
      </div>
    )
  }

  return (
    <Button asChild variant="primary" size="md" className="w-full sm:w-auto">
      <a href={`${baseUrl}/${filename}`} download>
        {children}
      </a>
    </Button>
  )
}
