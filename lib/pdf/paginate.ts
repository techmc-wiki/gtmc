/**
 * TOC folio convergence helpers.
 *
 * pdfgen reports anchor destinations as 0-based body-relative page indices;
 * these helpers fill the assembled HTML and detect whether a subsequent
 * render moved any TOC target.
 */

import { unescapeHtml } from "./document/html-utils"

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
