"use client"

import type * as PdfjsModule from "pdfjs-dist"
import * as React from "react"
import { supportsHtmlInCanvas } from "@/components/canvasui/DecryptReveal"
import { ThemeDecrypt } from "@/components/canvasui/theme-decrypt"

/**
 * Client-side render of the PDF's first page (pdf.js) used as the
 * interactive decrypt-reveal surface. The whole preview is a download
 * link with a cursor-following "Download" label; the decrypt cipher is
 * the hover state.
 *
 * pdf.js is loaded inside the effect (runtime-selected because the module
 * evaluates browser globals at import time and must never run during SSR).
 * It fetches through the proxy with byte-range requests only — never the
 * whole file.
 */
export function PdfCoverPreview({ filename }: { filename: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [state, setState] = React.useState<"loading" | "ready" | "error">(
    "loading"
  )
  const [cursor, setCursor] = React.useState({ x: 0.5, y: 0.5 })
  const [hovered, setHovered] = React.useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_PDF_BASE_URL?.trim().replace(
    /\/+$/,
    ""
  )

  React.useEffect(() => {
    let cancelled = false

    async function renderCover() {
      if (!canvasRef.current) return
      try {
        // Loaded via plain URL, not the bundler: Turbopack dev's chunk
        // loader can fail for dynamically imported deps after HMR churn,
        // while a same-origin ESM import always resolves.
        const pdfjs = (await import(
          /* webpackIgnore: true */ "/pdfjs/pdf.min.mjs"
        )) as typeof PdfjsModule
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs"

        // Range-only loading: pdf.js issues byte-range requests against
        // this URL (the proxy forwards them to R2), pulling just the xref
        // and page 1 instead of the whole ~44 MB file.
        const doc = await pdfjs.getDocument({
          url: `/api/pdf/${filename}`,
          rangeChunkSize: 16384,
          disableAutoFetch: true,
          disableStream: false,
        }).promise
        const page = await doc.getPage(1)

        // Render at device resolution for a crisp preview.
        const canvas = canvasRef.current
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const cssWidth = canvas.clientWidth || 288
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({
          scale: (cssWidth * dpr) / base.width,
        })

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("no 2d context")

        // The WebGL capture pass flips Y when compositing the source
        // canvas; pre-flip here so the cover lands upright on screen in
        // native mode. Fallback mode composites the raw canvas, which
        // pdf.js already drew upright.
        const nativeMode = supportsHtmlInCanvas()
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        if (nativeMode) {
          const flipped = document.createElement("canvas")
          flipped.width = canvas.width
          flipped.height = canvas.height
          const fctx = flipped.getContext("2d")
          if (!fctx) throw new Error("no flip context")
          fctx.translate(0, flipped.height)
          fctx.scale(1, -1)
          fctx.drawImage(canvas, 0, 0)
          ctx.save()
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(flipped, 0, 0)
          ctx.restore()
        }

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
      <a
        href={baseUrl ? `${baseUrl}/${filename}` : undefined}
        download
        aria-disabled={!baseUrl}
        aria-label={`${state === "ready" ? "" : "Loading "}PDF cover — download`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setCursor({
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
          })
        }}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="focus-visible:outline-tech-main block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-4">
        <div className="border-tech-main/40 bg-surface relative h-full w-full overflow-hidden border">
          {state === "error" ? (
            <div className="text-tech-main/50 flex h-full items-center justify-center text-sm">
              Preview unavailable
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className={`h-full w-full object-contain transition-opacity duration-300 ${
                state === "ready" ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Cursor-following Download label (mouse only). Position is
              kept from the last mousemove so the exit transition plays in
              place instead of snapping to the container corner. */}
          <span
            aria-hidden="true"
            style={{
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
            }}
            className={`border-tech-main-dark bg-tech-main-dark text-tech-bg pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 border px-3 py-1.5 font-mono text-xs font-semibold tracking-wider transition-[opacity,scale] duration-200 ease-out ${
              hovered ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}>
            Download
          </span>
        </div>
      </a>
    </ThemeDecrypt>
  )
}
