import * as React from "react"
import { TechButton } from "@/components/ui/tech-button"

/** Primary download button wired to the generated PDF asset. */
export function DownloadButton({
  filename,
  children,
}: {
  filename: string
  children: React.ReactNode
}) {
  return (
    <TechButton
      asChild
      variant="primary"
      size="lg"
      className="w-full sm:w-auto">
      <a href={`/${filename}`} download>
        {children}
      </a>
    </TechButton>
  )
}
