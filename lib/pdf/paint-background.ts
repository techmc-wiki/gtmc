/**
 * Post-processing step: paint a full-page background rectangle behind all
 * existing content on every page of a pdf-lib PDFDocument.
 *
 * CSS `background` on `html`/`body` only fills the CSS page box — the
 * `@page` margin area is always white. Chromium's header/footer templates
 * live in that margin area and cannot reliably fill it with CSS alone.
 *
 * This function solves it at the PDF level: for each page, a content stream
 * that draws a filled rectangle covering the full media box is *prepended*
 * to the page's `Contents` array. Because it comes first, existing content
 * (text, images, header/footer) paints on top of it.
 */

import type { PDFDocument } from "pdf-lib"
import { PDFName, PDFArray, PDFRef } from "pdf-lib"

/**
 * @param hexColor  6-char hex color, e.g. `"f5f4ef"` (no leading `#`)
 */
export function paintPageBackgrounds(doc: PDFDocument, hexColor: string): void {
  const r = parseInt(hexColor.slice(0, 2), 16) / 255
  const g = parseInt(hexColor.slice(2, 4), 16) / 255
  const b = parseInt(hexColor.slice(4, 6), 16) / 255

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    const stream = `q ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} rg 0 0 ${width} ${height} re f Q\n`

    const bgRef = doc.context.register(
      doc.context.flateStream(Buffer.from(stream))
    )

    const contents = page.node.get(PDFName.of("Contents"))
    if (contents instanceof PDFArray) {
      const arr = doc.context.obj([bgRef])
      for (let i = 0; i < contents.size(); i++) {
        arr.push(contents.get(i))
      }
      page.node.set(PDFName.of("Contents"), arr)
    } else if (contents instanceof PDFRef) {
      page.node.set(PDFName.of("Contents"), doc.context.obj([bgRef, contents]))
    }
  }
}
