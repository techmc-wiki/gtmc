"use client"

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react"
import {
  createPeelScene,
  type PeelScene,
} from "@/components/canvasui/peel-scene"

// Paper geometry and lighting adapted from Canvas UI Peel by David Haz.
// https://canvasui.dev/docs/components/peel (MIT + Commons Clause)
// A direct image texture keeps this version independent of HTML-in-canvas.

function usePeelCanvas(
  src: string,
  opened: boolean,
  onOpenChange: (opened: boolean) => void
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const sceneRef = useRef<PeelScene | null>(null)
  const changeOpen = useEffectEvent(onOpenChange)

  useEffect(() => {
    if (!src) return
    const scene = createPeelScene({
      root: rootRef.current,
      canvas: canvasRef.current,
      image: imageRef.current,
      onOpenChange: changeOpen,
    })
    sceneRef.current = scene
    return () => {
      sceneRef.current = null
      scene?.dispose()
    }
  }, [src])

  useEffect(() => {
    sceneRef.current?.setOpen(opened)
  }, [opened])
  return { rootRef, canvasRef, imageRef }
}

export function ImagePeel({
  src,
  alt = "",
  children,
  opened,
  onOpenChange,
}: {
  src: string
  alt?: string
  children: ReactNode
  opened: boolean
  onOpenChange: (opened: boolean) => void
}) {
  const { rootRef, canvasRef, imageRef } = usePeelCanvas(
    src,
    opened,
    onOpenChange
  )

  return (
    <div
      ref={rootRef}
      data-peel-open={opened}
      className="group/peel relative h-full w-full"
      aria-hidden="true">
      <div className="absolute inset-0 overflow-hidden">{children}</div>
      {/* The image stays visible until the GPU texture is ready, and is the
          complete fallback for reduced motion or unavailable WebGL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="relative h-full w-full object-contain group-data-[peel-open=true]/peel:invisible group-data-[peel-ready=true]/peel:invisible"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 group-data-[peel-ready=true]/peel:opacity-100 motion-reduce:hidden"
      />
    </div>
  )
}
