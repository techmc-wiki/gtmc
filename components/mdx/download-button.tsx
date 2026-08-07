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
    <a href={`/${filename}`} download>
      <TechButton variant="primary" size="lg" className="w-full sm:w-auto">
        {children}
      </TechButton>
    </a>
  )
}
