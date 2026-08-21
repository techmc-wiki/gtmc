"use client"

import type * as PdfjsModule from "pdfjs-dist"
import * as React from "react"
import { ThemeDecrypt } from "@/components/canvasui/theme-decrypt"

/**
 * Client-side render of the PDF's first page (pdf.js) used as the
 * interactive decrypt-reveal surface. The whole preview is a download
 * link with a cursor-following "Download" label; the decrypt cipher is
 * the hover state.
 *
 * pdf.js is loaded inside the effect (runtime-selected because the module
 * evaluates browser globals at import time and must never run during SSR).
 */
export function PdfCoverPreview({ filename }: { filename: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [state, setState] = React.useState<"loading" | "ready" | "error">(
    "loading"
  )
  const [cursor, setCursor] = React.useState<{ x: number; y: number } | null>(
    null
  )

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

        const response = await fetch(`/api/pdf/${filename}`, {
          signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) throw new Error(`fetch ${response.status}`)
        const data = await response.arrayBuffer()

        const doc = await pdfjs.getDocument({ data }).promise
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

        // pdf.js renders the page bitmap upright but draws it into the
        // canvas with a flipped Y axis under html-in-canvas capture, so
        // flip it back here.
        ctx.save()
        ctx.translate(0, canvas.height)
        ctx.scale(1, -1)
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        ctx.restore()

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
        onMouseEnter={() => setCursor({ x: 0.5, y: 0.5 })}
        onMouseLeave={() => setCursor(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setCursor({
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
          })
        }}
        onFocus={() => setCursor({ x: 0.5, y: 0.5 })}
        onBlur={() => setCursor(null)}
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

          {/* Cursor-following Download label (mouse only). */}
          <span
            aria-hidden="true"
            style={
              cursor
                ? {
                    left: `${cursor.x * 100}%`,
                    top: `${cursor.y * 100}%`,
                  }
                : undefined
            }
            className={`border-tech-main-dark bg-tech-main-dark text-tech-bg pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 border px-3 py-1.5 font-mono text-xs font-semibold tracking-wider transition-opacity duration-150 ${
              cursor ? "opacity-100" : "opacity-0"
            }`}>
            Download
          </span>
        </div>
      </a>
    </ThemeDecrypt>
  )
}
