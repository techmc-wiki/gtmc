import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import type { ImageSource } from "@takumi-rs/helpers/renderer"
import sharp from "sharp"

import { articlesRoot, cacheDir } from "@/workspace"

export type { ImageSource }

/**
 * The renderer embeds PNG, JPEG, WebP, and SVG. It has no decoder for GIF, nor
 * for the bitmap formats that turn up under a misleading extension — one
 * article ships a `.png` that is really a Windows bitmap, which a browser
 * sniffs happily and this renderer cannot read. Formats are therefore detected
 * from the bytes, never from the filename.
 */
const GIF_MAGIC = Buffer.from("GIF8", "ascii")

/** Bumped whenever the encoder settings change, to invalidate the disk cache. */
const ENCODER_VERSION = "webp-q82-v1"

export interface ConvertedImage {
  /** `src` value as referenced from the article HTML. */
  src: string
  /** Absolute path of the original file. */
  file: string
  /** Byte size of the original file. */
  fromBytes: number
  /** Byte size of the WebP handed to takumi. */
  toBytes: number
  /** Absolute path of the cached WebP. */
  cachedFile: string
  /** True when the WebP was already in the on-disk cache. */
  cacheHit: boolean
}

export interface PreparedImages {
  /** Unchanged HTML — `src` values are resolved through the `images` list. */
  html: string
  /** Deduplicated takumi image entries, keyed by the `src` used in the HTML. */
  images: ImageSource[]
  /** `src` values that could not be found on disk; their tags are left alone. */
  missing: string[]
  /**
   * `src` values that exist on disk but that no available decoder can read.
   * These are content problems rather than rendering ones, and are reported
   * separately so a broken figure is not mistaken for a missing one.
   */
  unreadable: string[]
  /** One entry per image that was transcoded to a format the renderer embeds. */
  converted: ConvertedImage[]
}

export interface PrepareImagesOptions {
  /**
   * Directory the article's `src` values are relative to, absolute or relative to
   * the articles root (e.g. `BlockUpdate`). The flattened PDF sidecars lose that
   * context, so without it resolution falls back to a repository-wide search.
   */
  baseDir?: string
}

const IMG_TAG = /<img\b[^>]*>/g
const SRC_ATTR = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i
const REMOTE_SRC = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

/**
 * Transcode bytes the renderer cannot embed, memoizing the result under
 * `.cache/assets` so repeated builds only pay the encode once per file. GIFs
 * become WebP: a book page is static, so sharp's first frame is kept, and
 * dropping the frames is what takes 18.9 MiB of animation down to 0.3 MiB.
 * Everything else becomes PNG, which is lossless.
 */
async function transcode(bytes: Uint8Array, animated: boolean) {
  const digest = createHash("sha256")
    .update(ENCODER_VERSION)
    .update("\0")
    .update(bytes)
    .digest("hex")
    .slice(0, 32)

  const extension = animated ? "webp" : "png"
  const cachedFile = path.join(cacheDir(), "assets", `${digest}.${extension}`)
  const cached = await readFile(cachedFile).catch(() => null)
  if (cached)
    return { data: new Uint8Array(cached), cachedFile, cacheHit: true }

  const source = sharp(bytes)
  const encoded = await (
    animated
      ? source.webp({ quality: 82 })
      : source.png({ compressionLevel: 9 })
  ).toBuffer()

  await mkdir(path.dirname(cachedFile), { recursive: true })
  const tmp = `${cachedFile}.${process.pid}.tmp`
  await writeFile(tmp, encoded)
  await rename(tmp, cachedFile)

  return { data: new Uint8Array(encoded), cachedFile, cacheHit: false }
}

interface AssetIndex {
  /** Files keyed by their path relative to the articles root, e.g. `BlockUpdate/img/a.png`. */
  byRelativePath: Map<string, string>
  /** Files keyed by basename; a name can repeat across chapters. */
  byBasename: Map<string, string[]>
}

let assetIndex: Promise<AssetIndex> | null = null

/**
 * Article sources reference images as `./img/<name>`, relative to their own
 * directory in the articles tree, and the content pipeline percent-encodes
 * non-ASCII names. The PDF sidecars are flat files, so both the directory and
 * the encoding have to be undone: index every non-markdown file in the tree by
 * relative path and by basename.
 */
function indexArticleAssets(): Promise<AssetIndex> {
  assetIndex ??= (async () => {
    const root = articlesRoot()
    const byRelativePath = new Map<string, string>()
    const byBasename = new Map<string, string[]>()

    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true }).catch(
        () => []
      )
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if (entry.isFile() && !entry.name.endsWith(".md")) {
          byRelativePath.set(path.relative(root, full), full)
          const bucket = byBasename.get(entry.name)
          if (bucket) bucket.push(full)
          else byBasename.set(entry.name, [full])
        }
      }
    }

    await walk(root)
    return { byRelativePath, byBasename }
  })()

  return assetIndex
}

const digestCache = new Map<string, Promise<string>>()

/**
 * Resolve a reference whose article directory is unknown. A basename shared by
 * several chapters is only ambiguous when the copies differ in bytes; chapters
 * that reuse artwork store identical files.
 */
async function resolveByBasename(basename: string): Promise<string | null> {
  const candidates = (await indexArticleAssets()).byBasename.get(basename)
  if (candidates === undefined || candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0] as string

  const digests = await Promise.all(
    candidates.map((file) => {
      let digest = digestCache.get(file)
      digest ??= readFile(file)
        .then((bytes) => createHash("sha256").update(bytes).digest("hex"))
        .catch(() => "")
      digestCache.set(file, digest)
      return digest
    })
  )

  const first = digests[0]
  return digests.every((digest) => digest === first)
    ? (candidates[0] as string)
    : null
}

/**
 * Collect every `<img src>` in the article HTML and hand takumi the bytes for it.
 * GIFs are transcoded to WebP; everything else is passed through untouched.
 */
export async function prepareImages(
  html: string,
  options: PrepareImagesOptions = {}
): Promise<PreparedImages> {
  const images: ImageSource[] = []
  const missing: string[] = []
  const unreadable: string[] = []
  const converted: ConvertedImage[] = []
  const seen = new Set<string>()
  const baseDir =
    options.baseDir === undefined
      ? null
      : path.isAbsolute(options.baseDir)
        ? options.baseDir
        : path.join(articlesRoot(), options.baseDir)

  for (const [tag] of html.matchAll(IMG_TAG)) {
    const attr = SRC_ATTR.exec(tag)
    const src = (attr?.[1] ?? attr?.[2] ?? "").trim()
    if (src === "" || REMOTE_SRC.test(src) || seen.has(src)) continue
    seen.add(src)

    // `src` is percent-encoded; the files on disk are not.
    const raw = src.split(/[?#]/)[0] ?? ""
    let relative: string
    try {
      relative = decodeURIComponent(raw)
    } catch {
      relative = raw
    }
    relative = relative.replace(/^\.\//, "")

    let file =
      relative === "" || relative.startsWith("/")
        ? null
        : path.resolve(baseDir ?? articlesRoot(), relative)
    let bytes = file === null ? null : await readFile(file).catch(() => null)

    if (bytes === null) {
      const index = await indexArticleAssets()
      file =
        index.byRelativePath.get(relative) ??
        (await resolveByBasename(path.basename(relative)))
      bytes = file === null ? null : await readFile(file).catch(() => null)
    }

    if (file === null || bytes === null) {
      missing.push(src)
      continue
    }

    // Decide from the bytes, never the extension: a `.png` in these articles
    // is really a Windows bitmap. sharp is the authority on what it can read;
    // anything it reads that the renderer cannot embed is transcoded.
    const isSvg = /^\s*<(\?xml|svg)/i.test(
      bytes.subarray(0, 64).toString("latin1")
    )
    const meta = isSvg
      ? null
      : await sharp(bytes)
          .metadata()
          .catch(() => null)
    const format = meta?.format
    const embedsDirectly =
      isSvg || format === "png" || format === "jpeg" || format === "webp"

    if (embedsDirectly) {
      images.push({ src, data: new Uint8Array(bytes) })
      continue
    }

    // A format sharp cannot read either is a content problem, not a rendering
    // one: report it rather than failing the whole edition.
    const animated = GIF_MAGIC.equals(Buffer.from(bytes.subarray(0, 4)))
    if (meta === null && !animated) {
      unreadable.push(src)
      continue
    }

    const result = await transcode(bytes, animated).catch(() => null)
    if (result === null) {
      unreadable.push(src)
      continue
    }
    images.push({ src, data: result.data })
    converted.push({
      src,
      file,
      fromBytes: bytes.byteLength,
      toBytes: result.data.byteLength,
      cachedFile: result.cachedFile,
      cacheHit: result.cacheHit,
    })
  }

  return { html, images, missing, unreadable, converted }
}
