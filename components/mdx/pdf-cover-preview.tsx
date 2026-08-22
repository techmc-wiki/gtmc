"use client"

import * as React from "react"
import { useMounted } from "@/hooks/use-mounted"
import { ThemeDecrypt } from "@/components/canvasui/theme-decrypt"

/**
 * The PDF's rendered first page, used as the interactive decrypt-reveal
 * surface. The whole preview is a download link with a cursor-following
 * "Download" label; the decrypt cipher is the hover state.
 *
 * The cover ships as a pre-rendered image (see public/covers/): parsing
 * the ~25-44 MB source PDFs client-side needs full-file access and
 * recovery scans against their broken xref pointers, which no amount of
 * byte-range plumbing makes cheap.
 */
export function PdfCoverPreview({ filename }: { filename: string }) {
  const mounted = useMounted()
  const [cursor, setCursor] = React.useState({ x: 0.5, y: 0.5 })
  const [hovered, setHovered] = React.useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_PDF_BASE_URL?.trim().replace(
    /\/+$/,
    ""
  )
  const locale = filename.replaceAll(/^gtmc-|\.pdf$/g, "")
  const coverSrc = `/covers/gtmc-${locale}.png`

  return (
    <ThemeDecrypt className="relative mx-auto aspect-[1/1.414] w-64 touch-none sm:w-72">
      <a
        href={baseUrl ? `${baseUrl}/${filename}` : undefined}
        download
        aria-disabled={!baseUrl}
        aria-label="PDF cover — download"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mounted ? coverSrc : undefined}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
          />

          {/* Cursor-following Download label (mouse only). Position is
              kept from the last mousemove so the exit transition plays in
              place instead of snapping to the container corner. */}
          <span
            aria-hidden="true"
            style={{
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
            }}
            className={`border-tech-main-dark bg-tech-main-dark text-tech-bg hover:bg-tech-signal hover:border-tech-signal hover:text-tech-signal-ink pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 border px-3 py-1.5 font-mono text-xs font-semibold tracking-wider transition-[opacity,scale,background-color,border-color,color] duration-200 ease-out ${
              hovered ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}>
            Download
          </span>
        </div>
      </a>
    </ThemeDecrypt>
  )
}
