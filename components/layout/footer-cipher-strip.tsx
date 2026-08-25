"use client"

import { ThemeDecrypt } from "@/components/canvasui/theme-decrypt"

/**
 * Decorative production-credit strip along the footer's top rule — the
 * typesetting line a printed colophon carries. Reads as an ASCII cipher and
 * decodes around the cursor, echoing the PDF cover motif. Purely decorative:
 * aria-hidden, no information a reader needs.
 */
export function FooterCipherStrip() {
  return (
    <ThemeDecrypt
      className="relative h-9 w-full"
      options={{
        radius: 150,
        cell: 7,
        passthrough: 0.3,
        aberration: 2,
        edgeGlow: 1,
      }}>
      <div className="flex h-full items-center justify-center overflow-hidden">
        <span
          aria-hidden="true"
          className="text-tech-main/60 sm:tracking-tech-wide font-mono text-[0.5625rem] tracking-wider whitespace-nowrap select-none sm:text-[0.625rem]">
          SET IN STIX &amp; GEIST · PRINTED ON THE OPEN WEB
        </span>
      </div>
    </ThemeDecrypt>
  )
}
