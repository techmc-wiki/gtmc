#!/usr/bin/env npx tsx

/**
 * PDF Verification Script
 *
 * Reads a generated PDF and verifies it meets quality specifications.
 *
 * Usage:
 *   npx tsx scripts/verify-pdf.ts                                          # checks public/gtmc.pdf
 *   npx tsx scripts/verify-pdf.ts --file path/to/output.pdf               # checks a custom path
 */

import { PDFDocument, PDFName, PDFRef } from "pdf-lib"
import fs from "node:fs"
import path from "node:path"

type DictLike = { get(key: PDFName): unknown }

// ── Helpers ──────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Read the PDF version string from the file header (e.g. "1.4", "1.7").
 */
function getPdfVersion(filePath: string): string {
  try {
    const buf = Buffer.alloc(20)
    const fd = fs.openSync(filePath, "r")
    fs.readSync(fd, buf, 0, 20, 0)
    fs.closeSync(fd)
    const m = buf.toString("utf-8").match(/%PDF-(\d+\.\d+)/)
    return m ? m[1] : "unknown"
  } catch {
    return "unknown"
  }
}

/**
 * Read the /Outlines entry from the PDF catalog and count bookmark entries.
 *
 * Returns:
 *   > 0  → number of outline entries found
 *   -1   → Outlines dictionary exists but /Count could not be read
 *   0    → no Outlines dictionary (no bookmarks)
 */
function getOutlineCount(pdfDoc: PDFDocument): number {
  try {
    const entry = pdfDoc.catalog.get(PDFName.of("Outlines"))
    if (!entry) return 0

    if (entry instanceof PDFRef) {
      const obj = pdfDoc.context.lookup(entry)
      if (obj && typeof obj === "object" && "get" in obj) {
        const countEntry = (obj as DictLike).get(PDFName.of("Count"))
        if (countEntry != null) {
          return Number(countEntry)
        }
      }
    }
    return -1
  } catch {
    return -1
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const fileIdx = args.indexOf("--file")

  const pdfPath =
    fileIdx !== -1 && fileIdx + 1 < args.length
      ? path.resolve(process.cwd(), args[fileIdx + 1])
      : path.join(process.cwd(), "public", "gtmc.pdf")

  // ── File existence ───────────────────────────────────────────────
  if (!fs.existsSync(pdfPath)) {
    console.error(`[verify] ✗ File not found: ${pdfPath}`)
    process.exit(1)
  }

  // ── File stats ──────────────────────────────────────────────────
  let stats: fs.Stats
  try {
    stats = fs.statSync(pdfPath)
  } catch (err) {
    console.error(`[verify] ✗ Failed to read file: ${err}`)
    process.exit(1)
  }

  // Wait 500 ms in case the file is still being flushed by a concurrent writer
  await new Promise((r) => setTimeout(r, 500))

  // ── Load PDF ────────────────────────────────────────────────────
  let pdfDoc: PDFDocument
  try {
    pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath))
  } catch (err) {
    console.error(`[verify] ✗ Failed to load PDF: ${err}`)
    process.exit(1)
  }

  // ── Collect results ─────────────────────────────────────────────
  const report: string[] = [`PDF: ${pdfPath}`]

  const pageCount = pdfDoc.getPageCount()
  const pagesOk = pageCount > 0
  report.push(`Pages: ${pageCount}${pagesOk ? "" : " (ERROR: no pages)"}`)

  const sizeLimit = 52428800
  const sizeOk = stats.size < sizeLimit
  report.push(
    `Size: ${formatSize(stats.size)} (under 50MB limit ${sizeOk ? "✓" : "✗"})`
  )

  const version = getPdfVersion(pdfPath)
  report.push(`Version: ${version}`)

  const outlineCount = getOutlineCount(pdfDoc)
  let bookmarksOk = false
  if (outlineCount > 0) {
    bookmarksOk = true
    report.push(`Bookmarks: ${outlineCount} entries (found ✓)`)
  } else if (outlineCount === -1) {
    bookmarksOk = true
    report.push(`Bookmarks: found (count unavailable)`)
  } else {
    report.push(`Bookmarks: none found`)
  }

  const allPass = pagesOk && sizeOk && bookmarksOk

  for (const line of report) {
    console.log(`[verify] ${line}`)
  }

  if (allPass) {
    console.log(`[verify] ✓ All checks passed`)
    process.exit(0)
  } else {
    console.error(`[verify] ✗ Some checks failed`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`[verify] Fatal error: ${err}`)
  process.exit(1)
})
