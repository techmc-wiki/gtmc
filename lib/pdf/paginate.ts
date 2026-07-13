/**
 * Page measurement for the two-pass render.
 *
 * Chromium's `page.pdf()` writes a `/Dests` name dictionary into the PDF
 * catalog with an entry for every internally-linked anchor (`<a href="#id">`
 * → element `id`), each pointing at the page object where the anchor landed.
 * Pass 1 renders the body with empty folio placeholders, this module reads
 * the real page index per anchor, and pass 2 re-renders with folios filled.
 */

import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef } from "pdf-lib"

import { unescapeHtml } from "./document/html-utils"

/**
 * Decode a PDF name string ("/article-foo#2Fbar") into the original anchor
 * id ("article-foo/bar"). `#xx` is the PDF hex escape for a name byte.
 */
export function decodePdfDestName(raw: string): string {
  const withoutSlash = raw.startsWith("/") ? raw.slice(1) : raw
  return withoutSlash.replaceAll(/#([0-9a-fA-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

/**
 * Read the `/Dests` dictionary of a rendered PDF and return a map of
 * anchor id → 0-based page index.
 */
export async function readAnchorPageIndices(
  pdfBytes: Uint8Array
): Promise<Map<string, number>> {
  const doc = await PDFDocument.load(pdfBytes)
  const result = new Map<string, number>()

  const pageIndexByRef = new Map<string, number>()
  doc.getPages().forEach((page, index) => {
    pageIndexByRef.set(page.ref.toString(), index)
  })

  const dests = doc.catalog.lookup(PDFName.of("Dests"))
  if (!(dests instanceof PDFDict)) return result

  for (const [name] of dests.entries()) {
    const dest = dests.lookup(name)
    if (!(dest instanceof PDFArray) || dest.size() === 0) continue
    const pageRef = dest.get(0)
    if (!(pageRef instanceof PDFRef)) continue
    const pageIndex = pageIndexByRef.get(pageRef.toString())
    if (pageIndex === undefined) continue
    result.set(decodePdfDestName(name.toString()), pageIndex)
  }

  return result
}

/**
 * Fill `.toc-folio` placeholders with 1-based page numbers from the
 * measured anchor map. Placeholders whose anchor was not measured stay
 * empty and are reported in `missing`.
 */
export function fillTocFolios(
  html: string,
  anchorPages: Map<string, number>
): { html: string; missing: string[] } {
  const missing: string[] = []

  const filled = html.replaceAll(
    /<span class="toc-folio" data-anchor="([^"]*)"><\/span>/g,
    (match, anchor: string) => {
      const decodedAnchor = unescapeHtml(anchor)
      const pageIndex = anchorPages.get(decodedAnchor)
      if (pageIndex === undefined) {
        missing.push(decodedAnchor)
        return match
      }
      return `<span class="toc-folio" data-anchor="${anchor}">${pageIndex + 1}</span>`
    }
  )

  return { html: filled, missing }
}

export function haveTocFolioPagesChanged(
  emptyFolioHtml: string,
  insertedPages: Map<string, number>,
  measuredPages: Map<string, number>
): boolean {
  for (const match of emptyFolioHtml.matchAll(
    /<span class="toc-folio" data-anchor="([^"]*)"><\/span>/g
  )) {
    const anchor = match[1]
    if (!anchor) continue
    const decodedAnchor = unescapeHtml(anchor)
    if (insertedPages.get(decodedAnchor) !== measuredPages.get(decodedAnchor)) {
      return true
    }
  }

  return false
}
