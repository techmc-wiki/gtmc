"use client"

import dynamic from "next/dynamic"
import type { LitematicaViewerProps } from "@/components/articles/litematica-viewer"

const litematicaFallbackStyle = { height: 400 }

const LitematicaViewer = dynamic(
  () => import("@/components/articles/litematica-viewer"),
  {
    loading: () => <LitematicaViewerFallback />,
  }
)

function LitematicaViewerFallback() {
  return (
    <div
      className="border-tech-line bg-surface-overlay/70 flex items-center justify-center rounded-sm border text-sm tracking-[0.18em] text-tech-muted uppercase"
      style={litematicaFallbackStyle}>
      LOADING_SCHEMATIC_
    </div>
  )
}

export function LitematicaViewerDynamic(props: LitematicaViewerProps) {
  return <LitematicaViewer {...props} />
}
