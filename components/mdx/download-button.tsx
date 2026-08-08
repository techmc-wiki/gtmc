import * as React from "react"
import { TechButton } from "@/components/ui/tech-button"

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
        <TechButton
          variant="primary"
          size="lg"
          className="w-full sm:w-auto"
          disabled
          aria-disabled="true">
          {children}
        </TechButton>
        <p className="text-tech-main/60 font-mono text-xs tracking-wide">
          {unavailableNote}
        </p>
      </div>
    )
  }

  return (
    <TechButton
      asChild
      variant="primary"
      size="lg"
      className="w-full sm:w-auto">
      <a href={`${baseUrl}/${filename}`} download>
        {children}
      </a>
    </TechButton>
  )
}
