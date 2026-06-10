"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import type { LitematicaViewerProps } from "@/components/articles/litematica-viewer"

export function LitematicaViewerDynamic(props: LitematicaViewerProps) {
  const [Viewer, setViewer] =
    useState<ComponentType<LitematicaViewerProps> | null>(null)
  const placeholderStyle = useMemo(
    () => ({ height: props.height ?? 400 }),
    [props.height]
  )

  useEffect(() => {
    let isMounted = true

    void import("@/components/articles/litematica-viewer").then((mod) => {
      if (isMounted) {
        setViewer(() => mod.default)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  if (Viewer) {
    return <Viewer {...props} />
  }

  return (
    <div
      className="border-tech-line bg-surface-overlay/70 flex items-center justify-center rounded-sm border text-sm tracking-[0.18em] text-tech-muted uppercase"
      style={placeholderStyle}>
      LOADING_SCHEMATIC_
    </div>
  )
}
