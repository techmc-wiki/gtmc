"use client"

import * as React from "react"
import { useMounted } from "@/hooks/use-mounted"
import { CanvasPainting } from "@/components/canvasui/Canvas"

/**
 * The PDF's rendered first page, painted onto a woven-artist-canvas
 * surface. The whole preview is a download link with a cursor-following
 * "Download" label; the cursor works as a loaded brush, leaving wet
 * strokes that catch the light and dry back into the weave.
 *
 * The cover ships as a pre-rendered image (see public/covers/): parsing
 * the ~25-44 MB source PDFs client-side needs full-file access and
 * recovery scans against their broken xref pointers, which no amount of
 * byte-range plumbing makes cheap.
 */
const COVER_TINT: [number, number, number] = [0.961, 0.957, 0.937]

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
    <div className="relative mx-auto aspect-[1/1.414] w-64 touch-none min-[420px]:w-72 sm:w-[26rem]">
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
        {/* Only the cover image is painted onto the weave — the Download
            chip stays outside as real HTML so it never gets captured into
            the canvas snapshot. */}
        <CanvasPainting
          className="h-full w-full"
          // GTMC-tuned weave: warm archival-paper tint, a quiet halftone
          // screen, and a brush sized to the cover rather than the viewport.
          tint={COVER_TINT}
          tintStrength={0.12}
          halftone={0.15}
          dotSize={5}
          grain={0.45}
          radius={0.07}>
          <div className="border-tech-main/40 bg-surface h-full w-full overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mounted ? coverSrc : undefined}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
            />
          </div>
        </CanvasPainting>
      </a>
      {/* Cursor-following Download label (mouse only). Position is
          kept from the last mousemove so the exit transition plays in
          place instead of snapping to the container corner. Fill and
          text are fixed ink-on-paper values — the cover render is
          always bright, so the chip must stay a dark button in both
          themes; only its outline softens on dark pages. */}
      <span
        aria-hidden="true"
        style={{
          left: `${cursor.x * 100}%`,
          top: `${cursor.y * 100}%`,
        }}
        className={`dark:border-tech-bg/40 pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 border border-[#20283c] bg-[#20283c] px-3 py-1.5 font-mono text-xs font-semibold tracking-wider text-[#f5f4ef] transition-[opacity,scale,border-color] duration-200 ease-out ${
          hovered ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}>
        Download
      </span>
    </div>
  )
}
