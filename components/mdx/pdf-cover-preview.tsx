"use client"

import * as React from "react"
import { ThemeDecrypt } from "@/components/canvasui/theme-decrypt"

/**
 * Client-side render of the PDF's first page (pdf.js) used as the
 * interactive decrypt-reveal surface. The canvas is only the visual: the
 * download button below stays real HTML in both effect modes.
 *
 * pdf.js is loaded inside the effect (runtime-selected because the module
 * evaluates browser globals at import time and must never run during SSR).
 */
export function PdfCoverPreview({ filename }: { filename: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [state, setState] = React.useState<"loading" | "ready" | "error">(
    "loading"
  )

  React.useEffect(() => {
    let cancelled = false

    async function renderCover() {
      const canvas = canvasRef.current
      if (!canvas) return
      try {
        // SSR would crash on pdf.js module evaluation (DOMMatrix at top
        // level); the specifier is static but the load must be client-only.
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString()

        const response = await fetch(`/api/pdf/${filename}`, {
          signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) throw new Error(`fetch ${response.status}`)
        const data = await response.arrayBuffer()

        const doc = await pdfjs.getDocument({ data }).promise
        const page = await doc.getPage(1)
        const base = page.getViewport({ scale: 1 })

        // Render at device resolution for a crisp preview.
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const cssWidth = canvas.clientWidth || 320
        const scale = ((cssWidth * dpr) / base.width) as number
        const viewport = page.getViewport({ scale })

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("no 2d context")
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        if (!cancelled) setState("ready")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    void renderCover()
    return () => {
      cancelled = true
    }
  }, [filename])

  return (
    <ThemeDecrypt className="relative mx-auto aspect-[1/1.414] w-64 touch-none sm:w-72">
      <div className="border-tech-main/40 bg-surface relative h-full w-full overflow-hidden border">
        {state === "error" ? (
          <div className="text-tech-main/50 flex h-full items-center justify-center text-sm">
            Preview unavailable
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          aria-label="PDF cover preview"
          className={`h-full w-full object-contain transition-opacity duration-300 ${
            state === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </ThemeDecrypt>
  )
}
