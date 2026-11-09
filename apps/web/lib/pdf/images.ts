import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import sharp from "sharp"
import { ARTICLES_PATH } from "@/lib/articles/fs"
import { hasExplicitUrlScheme } from "@/lib/markdown/url-utils"
import { workspacePath } from "@/lib/workspace-paths"

import { toTypstRootPath, writeFileAtomic } from "./artifacts"

const REMOTE_CACHE_DIR = workspacePath(
  "tools",
  "pdf",
  "work",
  ".cache",
  "images"
)

const MAX_WIDTH = 2000
const LARGE_PNG_BYTES = 8 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 20 * 1000
const FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 500
const USER_AGENT = "gtmc-pdf-images/1.0 (+https://www.techmc.wiki)"

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])
const SVG_SNIFF_BYTES = 64 * 1024

type SourceFormat = "png" | "jpeg" | "gif" | "webp" | "avif" | "svg" | "bmp"

export type PdfImageResult = { path: string } | { missing: string }

type Context = {
  source: string
  articleFilePath: string | null
  locale: string
}

/** A remote image that could not be downloaded. Not fatal: the book renders a placeholder. */
class ImageDownloadError extends Error {}

/**
 * Resolves each markdown image source to a Typst-readable file in `outDir`.
 * Images that do not exist (a dead remote host, or a local file the article
 * references but the content repo lacks) resolve to `{ missing }` with a
 * warning: the content is wrong, but one bad reference must not block the
 * book. Files that exist but cannot be decoded throw, naming the source and article.
 */
export async function resolvePdfImages(
  sources: string[],
  opts: { articleFilePath: string | null; outDir: string; locale: string }
): Promise<Map<string, PdfImageResult>> {
  await fs.promises.mkdir(opts.outDir, { recursive: true })

  const unique = [...new Set(sources)]
  const resolved = await Promise.all(
    unique.map(async (source): Promise<[string, PdfImageResult]> => {
      const context: Context = {
        source,
        articleFilePath: opts.articleFilePath,
        locale: opts.locale,
      }
      try {
        return [source, { path: await resolveOne(context, opts.outDir) }]
      } catch (error) {
        const article = opts.articleFilePath ?? "(no article)"
        const isMissingFile = (error as NodeJS.ErrnoException).code === "ENOENT"
        if (error instanceof ImageDownloadError || isMissingFile) {
          console.warn(
            `[pdf] missing image in ${article} (${opts.locale}): ${source} (${error instanceof Error ? error.message : String(error)})`
          )
          return [source, { missing: source }]
        }
        throw new Error(
          `Cannot resolve image "${source}" in ${article} (${opts.locale}): ${error instanceof Error ? error.message : String(error)}`,
          { cause: error }
        )
      }
    })
  )
  return new Map(resolved)
}

async function resolveOne(context: Context, outDir: string): Promise<string> {
  const bytes = await loadBytes(context)
  const format = sniffFormat(bytes)
  if (!format) {
    throw new Error("not a PNG, JPEG, GIF, BMP, WebP, AVIF or SVG file")
  }

  const output = await toTypstImage(bytes, format)
  const name = `${crypto.createHash("sha256").update(output.bytes).digest("hex").slice(0, 16)}.${output.ext}`
  const target = path.join(outDir, name)
  await writeIfMissing(target, output.bytes)
  return toTypstRootPath(target)
}

async function loadBytes(context: Context): Promise<Buffer> {
  const { source } = context
  if (source.startsWith("data:")) return decodeDataUri(source)
  if (/^https?:\/\//i.test(source)) return loadRemote(source)
  if (hasExplicitUrlScheme(source)) {
    throw new Error("only http(s), data: and local paths are supported")
  }
  return fs.promises.readFile(resolveLocalPath(context))
}

function resolveLocalPath({ source, articleFilePath }: Context): string {
  const decoded = decodeURIComponent(source)
  if (source.startsWith("/")) {
    return path.join(ARTICLES_PATH, decoded.replace(/^\//, ""))
  }
  if (!articleFilePath) {
    throw new Error("a relative path needs an article file to resolve against")
  }
  return path.resolve(
    path.dirname(path.join(ARTICLES_PATH, articleFilePath)),
    decoded
  )
}

function decodeDataUri(source: string): Buffer {
  const match = /^data:([^,]*),([\s\S]*)$/.exec(source)
  if (!match) throw new Error("malformed data URI")

  const [, meta, data] = match
  if (meta.endsWith(";base64")) return Buffer.from(data, "base64")
  return Buffer.from(decodeURIComponent(data), "utf-8")
}

async function loadRemote(url: string): Promise<Buffer> {
  const cacheFile = path.join(
    REMOTE_CACHE_DIR,
    crypto.createHash("sha256").update(url).digest("hex")
  )
  try {
    return await fs.promises.readFile(cacheFile)
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error
    }
  }

  const bytes = await fetchWithRetry(url, 1)
  await fs.promises.mkdir(REMOTE_CACHE_DIR, { recursive: true })
  await writeFileAtomic(cacheFile, bytes)
  return bytes
}

async function fetchWithRetry(url: string, attempt: number): Promise<Buffer> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "image/*" },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    if (attempt >= FETCH_ATTEMPTS) {
      throw new ImageDownloadError(
        `download failed after ${FETCH_ATTEMPTS} attempts: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      )
    }
    await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    return fetchWithRetry(url, attempt + 1)
  }
}

function sniffFormat(bytes: Buffer): SourceFormat | undefined {
  if (bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return "png"
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg"
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp"

  const head4 = bytes.subarray(0, 4).toString("latin1")
  if (head4 === "GIF8") return "gif"
  if (head4 === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") {
    return "webp"
  }

  if (bytes.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = bytes.subarray(8, 12).toString("latin1")
    if (brand === "avif" || brand === "avis") return "avif"
  }

  const text = bytes.subarray(0, SVG_SNIFF_BYTES).toString("utf-8")
  if (/<svg[\s>]/i.test(text)) return "svg"
  return undefined
}

type TypstImage = { bytes: Buffer; ext: "png" | "jpg" | "svg" }

/**
 * Typst reads PNG, JPEG, GIF and SVG. Everything else is converted to PNG
 * (first frame only for animations). Rasters wider than MAX_WIDTH are shrunk,
 * never enlarged, and EXIF orientation is applied so the Typst output matches
 * what the site shows.
 */
async function toTypstImage(
  bytes: Buffer,
  format: SourceFormat
): Promise<TypstImage> {
  if (format === "svg") return { bytes, ext: "svg" }
  if (format === "bmp") {
    // The article repo contains BMP files named `.png`; libvips cannot read BMP.
    const bmp = decodeBmp(bytes)
    const png = await sharp(bmp.data, {
      raw: { width: bmp.width, height: bmp.height, channels: 3 },
    })
      .png()
      .toBuffer()
    return toTypstImage(png, "png")
  }

  const image = sharp(bytes, { animated: false })
  const meta = await image.metadata()
  if (!meta.width || !meta.height) {
    throw new Error("decoder reported no dimensions")
  }

  const orientation = meta.orientation ?? 1
  const displayWidth = orientation >= 5 ? meta.height : meta.width
  const tooWide = displayWidth > MAX_WIDTH

  const isPng = format === "png"
  const isJpeg = format === "jpeg"
  const keepSource =
    (isPng || isJpeg) &&
    !tooWide &&
    orientation === 1 &&
    !(isPng && bytes.length > LARGE_PNG_BYTES)
  if (keepSource) return { bytes, ext: isPng ? "png" : "jpg" }

  const pipeline = tooWide
    ? image.rotate().resize({ width: MAX_WIDTH })
    : image.rotate()
  if (isJpeg) {
    return {
      bytes: await pipeline.jpeg({ quality: 92 }).toBuffer(),
      ext: "jpg",
    }
  }
  return {
    bytes: await pipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer(),
    ext: "png",
  }
}

/** Uncompressed 24/32-bit Windows BMP to packed RGB (alpha is ignored; it is routinely zero). */
function decodeBmp(bytes: Buffer): {
  data: Buffer
  width: number
  height: number
} {
  const pixelOffset = bytes.readUInt32LE(10)
  const headerSize = bytes.readUInt32LE(14)
  const width = bytes.readInt32LE(18)
  const signedHeight = bytes.readInt32LE(22)
  const bitCount = bytes.readUInt16LE(28)
  const compression = bytes.readUInt32LE(30)
  if (
    headerSize < 40 ||
    compression !== 0 ||
    (bitCount !== 24 && bitCount !== 32)
  ) {
    throw new Error(
      `unsupported BMP (${bitCount}-bit, compression ${compression})`
    )
  }

  const height = Math.abs(signedHeight)
  const bytesPerPixel = bitCount / 8
  const stride = Math.ceil((width * bitCount) / 32) * 4
  const data = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    const sourceRow = signedHeight < 0 ? y : height - 1 - y
    for (let x = 0; x < width; x++) {
      const source = pixelOffset + sourceRow * stride + x * bytesPerPixel
      const target = (y * width + x) * 3
      data[target] = bytes[source + 2]
      data[target + 1] = bytes[source + 1]
      data[target + 2] = bytes[source]
    }
  }
  return { data, width, height }
}

async function writeIfMissing(target: string, bytes: Buffer): Promise<void> {
  if (fs.existsSync(target)) return
  await writeFileAtomic(target, bytes)
}
