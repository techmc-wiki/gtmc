/**
 * Local font provisioning for the PDF pipeline.
 *
 * The assembled PDF documents link the Google Fonts stylesheet
 * (`PDF_FONT_STYLESHEET_URL`). pdfgen spawns a fresh Chromium per render, so
 * every render pass re-downloads the full font set (five families, ~225 woff2
 * files) from fonts.googleapis.com — repeated rapid fetches from one runner
 * IP hit transient CDN failures and aborted whole runs with a font-readiness
 * timeout. Downloading the set once and rendering from local files removes
 * the network dependency from rendering entirely.
 *
 * The downloaded set lives under `data/pdf-fonts/` (gitignored with the rest
 * of `data/`): a `fonts.css` stylesheet whose woff2 URLs are rewritten to the
 * local `woff2/` directory. `generate-pdf.ts` copies it next to the assembled
 * HTML documents, so renders are deterministic and offline. If the download
 * fails, callers fall back to the Google Fonts stylesheet URL (previous
 * behavior) rather than failing the build.
 */

import fs from "node:fs"
import path from "node:path"

import { PDF_FONT_STYLESHEET_URL } from "./theme"

/** Chrome UA so Google Fonts serves woff2 (the format Chromium can load). */
const CHROME_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const FONTS_DIR = path.join(process.cwd(), "data", "pdf-fonts")
const CSS_FILENAME = "fonts.css"
const WOFF2_DIRNAME = "woff2"

/** How many woff2 files to fetch concurrently. */
const DOWNLOAD_CONCURRENCY = 16
const FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 500

const WOFF2_URL_PATTERN =
  /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g

/** Absolute path of the local font set (present after `syncPdfFonts`). */
export function pdfFontsDir(): string {
  return FONTS_DIR
}

/** True when a previously synced local font set is available. */
export function hasLocalPdfFonts(): boolean {
  return fs.existsSync(path.join(FONTS_DIR, CSS_FILENAME))
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  attempt = 1
): Promise<Response> {
  try {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }
    return response
  } catch (error) {
    if (attempt >= FETCH_ATTEMPTS) throw error
    await new Promise((resolve) =>
      setTimeout(resolve, RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    )
    return fetchWithRetry(url, headers, attempt + 1)
  }
}

async function downloadFile(url: string, outPath: string): Promise<void> {
  const response = await fetchWithRetry(url, {
    "user-agent": CHROME_UA,
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.promises.writeFile(outPath, buffer)
}

/** Run `workers` promises with `limit` concurrent slots, first failure aborts. */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0
  const slot = async (): Promise<void> => {
    /* oxlint-disable no-await-in-loop -- bounded pool: each slot drains
       items sequentially; concurrency comes from running N slots. */
    while (next < items.length) {
      const item = items[next]
      next += 1
      await worker(item)
    }
    /* oxlint-enable no-await-in-loop */
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => slot())
  )
}

/**
 * Download the Google Fonts stylesheet and every woff2 it references into
 * `data/pdf-fonts/`, rewriting the stylesheet to use local relative URLs.
 *
 * No-op when a previous sync is already present (local repeat builds). Throws
 * if any part of the download fails after retries, so callers can fall back
 * to the CDN stylesheet URL.
 */
export async function syncPdfFonts(): Promise<void> {
  if (hasLocalPdfFonts()) return

  const response = await fetchWithRetry(PDF_FONT_STYLESHEET_URL, {
    "user-agent": CHROME_UA,
  })
  const css = await response.text()

  const urls = [...css.matchAll(WOFF2_URL_PATTERN)].map((match) => match[1])
  if (urls.length === 0) {
    throw new Error(
      `Google Fonts stylesheet returned no woff2 URLs (${PDF_FONT_STYLESHEET_URL})`
    )
  }

  const woff2Dir = path.join(FONTS_DIR, WOFF2_DIRNAME)
  await fs.promises.mkdir(woff2Dir, { recursive: true })

  const uniqueUrls = [...new Set(urls)]
  await runPool(uniqueUrls, DOWNLOAD_CONCURRENCY, async (url) => {
    const fileName = path.basename(new URL(url).pathname)
    await downloadFile(url, path.join(woff2Dir, fileName))
  })

  const localCss = css.replace(
    WOFF2_URL_PATTERN,
    (_, url: string) =>
      `url(${WOFF2_DIRNAME}/${path.basename(new URL(url).pathname)})`
  )
  await fs.promises.writeFile(path.join(FONTS_DIR, CSS_FILENAME), localCss)
}
