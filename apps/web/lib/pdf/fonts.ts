/**
 * Typst renders the book PDFs with static OTF/TTF files. Every file is pinned
 * by sha256 in `tools/pdf/fonts.lock.json`, the only font list in the
 * pipeline, so renders are deterministic and offline once the cache is warm.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { z } from "zod"
import { workspacePath } from "@/lib/workspace-paths"

const FONTS_DIR = workspacePath("tools", "pdf", "fonts")
const LOCK_PATH = workspacePath("tools", "pdf", "fonts.lock.json")

const FONT_CONCURRENCY = 4
const FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 500
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000
const USER_AGENT = "gtmc-pdf-fonts/1.0 (+https://www.techmc.wiki)"

const LockSchema = z.object({
  fonts: z
    .array(
      z.object({
        family: z.string().min(1),
        file: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:ttf|otf)$/),
        url: z.url(),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
        license: z.string().min(1),
      })
    )
    .min(1),
})

type PdfFontEntry = z.infer<typeof LockSchema>["fonts"][number]

let inFlight: Promise<string> | undefined

/**
 * Makes every file in the lock file exist in `tools/pdf/fonts` with the pinned
 * sha256 and returns that directory. Concurrent callers share one sync.
 */
export async function ensurePdfFonts(): Promise<string> {
  inFlight ??= syncPdfFonts().finally(() => {
    inFlight = undefined
  })
  return inFlight
}

async function readLock(): Promise<PdfFontEntry[]> {
  const raw: unknown = JSON.parse(
    await fs.promises.readFile(LOCK_PATH, "utf-8")
  )
  const { fonts } = LockSchema.parse(raw)

  if (new Set(fonts.map((entry) => entry.file)).size !== fonts.length) {
    throw new Error(`Duplicate file names in ${LOCK_PATH}`)
  }
  return fonts
}

async function syncPdfFonts(): Promise<string> {
  const entries = await readLock()
  await fs.promises.mkdir(FONTS_DIR, { recursive: true })

  await runPool(entries, FONT_CONCURRENCY, (entry) =>
    ensureFontFile(entry, path.join(FONTS_DIR, entry.file))
  )
  await removeUnlistedFonts(new Set(entries.map((entry) => entry.file)))

  return FONTS_DIR
}

async function ensureFontFile(
  entry: PdfFontEntry,
  target: string
): Promise<void> {
  if ((await sha256OfFile(target)) === entry.sha256) return
  await downloadVerified(entry, target, 1)
}

async function downloadVerified(
  entry: PdfFontEntry,
  target: string,
  attempt: number
): Promise<void> {
  try {
    const response = await fetch(entry.url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const bytes = Buffer.from(await response.arrayBuffer())
    const digest = crypto.createHash("sha256").update(bytes).digest("hex")
    if (digest !== entry.sha256) {
      throw new Error(
        `sha256 mismatch: expected ${entry.sha256}, got ${digest}`
      )
    }
    await writeFileAtomic(target, bytes)
  } catch (error) {
    if (attempt >= FETCH_ATTEMPTS) {
      throw new Error(
        `Failed to download font ${entry.family} (${entry.file}) from ${entry.url}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      )
    }
    await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    return downloadVerified(entry, target, attempt + 1)
  }
}

async function writeFileAtomic(target: string, bytes: Buffer): Promise<void> {
  const temp = `${target}.${process.pid}.${crypto.randomUUID()}.part`
  try {
    await fs.promises.writeFile(temp, bytes)
    await fs.promises.rename(temp, target)
  } catch (error) {
    await fs.promises.rm(temp, { force: true })
    throw error
  }
}

async function removeUnlistedFonts(listed: Set<string>): Promise<void> {
  const names = await fs.promises.readdir(FONTS_DIR)
  await Promise.all(
    names
      .filter((name) => /\.(?:ttf|otf)$/.test(name) && !listed.has(name))
      .map((name) =>
        fs.promises.rm(path.join(FONTS_DIR, name), { force: true })
      )
  )
}

async function sha256OfFile(file: string): Promise<string | undefined> {
  try {
    return crypto
      .createHash("sha256")
      .update(await fs.promises.readFile(file))
      .digest("hex")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined
    }
    throw error
  }
}

/** Run workers with bounded concurrency; rejects on the first failure. */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0
  const slot = async (): Promise<void> => {
    while (next < items.length) {
      const item = items[next]
      next += 1
      await worker(item)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => slot())
  )
}
