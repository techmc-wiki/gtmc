import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createLogger } from "./logger"

const logger = createLogger("content-cache")

const CACHE_FORMAT_VERSION = 2
const CACHE_DIRECTORY = path.resolve(
  process.cwd(),
  process.env.GTMC_CONTENT_CACHE_DIR ?? ".next/cache/gtmc-content"
)

const GENERATED_ARTIFACTS = [
  "data/manifest.json",
  "data/articles",
  "data/.content-cache.json",
  "data/glossary.json",
  "data/glossary-summary.json",
  "public/article-assets",
  "public/gtmc-en.pdf",
  "public/gtmc-zh.pdf",
] as const

const GENERATED_ARTIFACT_DIRECTORIES = new Set([
  "data/articles",
  "public/article-assets",
])

const CONTENT_GENERATOR_FILES: string[] = [
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "i18n/routing.ts",
  "scripts/lib/run.ts",
  "scripts/build-content.ts",
  "scripts/generate-article-manifest.ts",
  "scripts/manifest-preview.ts",
  "scripts/generate-glossary-manifest.ts",
  "scripts/generate-article-content.ts",
  "scripts/generate-pdf.ts",
]

const CONTENT_GENERATOR_DIRECTORIES: string[] = [
  "lib/articles",
  "lib/github",
  "lib/glossary",
  "lib/markdown",
  "lib/pdf",
]

const ARCHIVE_PARENT_DIRECTORIES = new Set<string>()
for (const artifact of GENERATED_ARTIFACTS) {
  let parent = path.posix.dirname(artifact)
  while (parent !== ".") {
    ARCHIVE_PARENT_DIRECTORIES.add(parent)
    parent = path.posix.dirname(parent)
  }
}

export interface ContentArtifactCache {
  readonly key: string
  readonly archivePath: string
  readonly manifestPath: string
}

interface ContentArtifactCacheManifest {
  readonly formatVersion: number
  readonly key: string
  readonly artifacts: readonly string[]
  readonly nodeVersion: string
}

interface TarResult {
  readonly ok: boolean
  readonly output: string
}

function getCacheId(cache: ContentArtifactCache): string {
  return cache.key.slice(0, 12)
}

function listContentGeneratorFiles(): string[] {
  const files: string[] = [...CONTENT_GENERATOR_FILES]

  for (const relativeDirectory of CONTENT_GENERATOR_DIRECTORIES) {
    const directory = path.join(process.cwd(), relativeDirectory)
    if (!fs.existsSync(directory)) continue

    const pendingDirectories: string[] = [relativeDirectory]
    while (pendingDirectories.length > 0) {
      const currentDirectory = pendingDirectories.pop()
      if (!currentDirectory) continue

      const entries = fs
        .readdirSync(path.join(process.cwd(), currentDirectory), {
          withFileTypes: true,
        })
        .toSorted((left, right) => left.name.localeCompare(right.name))

      for (const entry of entries) {
        const relativePath = path.join(currentDirectory, entry.name)
        if (entry.isDirectory()) {
          pendingDirectories.push(relativePath)
          continue
        }
        if (!entry.isFile() || entry.name.endsWith(".test.ts")) {
          continue
        }
        files.push(relativePath)
      }
    }
  }

  return files.toSorted()
}

function readRevision(directory: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: path.join(process.cwd(), directory),
    encoding: "utf-8",
  })
  if (result.status !== 0) {
    throw new Error(
      `Unable to read ${directory} revision: ${result.stderr || result.error?.message || "unknown error"}`
    )
  }
  return result.stdout.trim()
}

function hasEveryGeneratedArtifact(root: string): string | null {
  for (const relativePath of GENERATED_ARTIFACTS) {
    const absolutePath = path.join(root, relativePath)
    const exists = fs.existsSync(absolutePath)
    if (!exists) return relativePath

    const stats = fs.statSync(absolutePath)
    if (GENERATED_ARTIFACT_DIRECTORIES.has(relativePath)) {
      if (!stats.isDirectory()) return relativePath
    } else if (!stats.isFile()) {
      return relativePath
    }
  }

  return null
}

function runTar(arguments_: string[]): TarResult {
  const result = spawnSync("tar", arguments_, {
    cwd: process.cwd(),
    encoding: "utf-8",
  })
  if (result.status !== 0) {
    const detail = result.stderr || result.error?.message || "unknown error"
    return { ok: false, output: detail.trim() }
  }
  return { ok: true, output: result.stdout }
}

function validateArchiveEntries(entries: string[]): string | null {
  const expectedDirectories = [...GENERATED_ARTIFACT_DIRECTORIES]
  for (const entry of entries) {
    const normalizedEntry = entry.replace(/\/+$/, "")
    const normalizedPath = path.posix.normalize(normalizedEntry)
    if (
      normalizedPath === "." ||
      path.posix.isAbsolute(normalizedPath) ||
      normalizedPath === ".." ||
      normalizedPath.startsWith("../")
    ) {
      return entry
    }

    const isExpectedArtifact = GENERATED_ARTIFACTS.includes(
      normalizedPath as (typeof GENERATED_ARTIFACTS)[number]
    )
    const isParentDirectory = ARCHIVE_PARENT_DIRECTORIES.has(normalizedPath)
    const isNestedArtifact = expectedDirectories.some((directory) =>
      normalizedPath.startsWith(`${directory}/`)
    )
    if (!isExpectedArtifact && !isParentDirectory && !isNestedArtifact) {
      return entry
    }
  }

  return null
}

export function createContentArtifactCache(): ContentArtifactCache | null {
  try {
    const hash = createHash("sha256")
    hash.update(`format:${CACHE_FORMAT_VERSION}\n`)
    hash.update(`node:${process.versions.node}\n`)
    hash.update(`articles:${readRevision("articles")}\n`)
    hash.update(`glossary:${readRevision("glossary")}\n`)

    for (const relativePath of listContentGeneratorFiles()) {
      hash.update(`${relativePath}\0`)
      hash.update(fs.readFileSync(path.join(process.cwd(), relativePath)))
      hash.update("\0")
    }

    const key = hash.digest("hex")
    return {
      key,
      archivePath: path.join(CACHE_DIRECTORY, `${key}.tar.gz`),
      manifestPath: path.join(CACHE_DIRECTORY, `${key}.json`),
    }
  } catch (error) {
    logger.warn("content-cache.disabled", {}, String(error))
    return null
  }
}

export function restoreContentArtifacts(cache: ContentArtifactCache): boolean {
  try {
    if (
      !fs.existsSync(cache.archivePath) ||
      !fs.existsSync(cache.manifestPath)
    ) {
      logger.event("content-cache.restore", {
        outcome: "miss",
        reason: "not-found",
      })
      return false
    }

    const manifest = JSON.parse(
      fs.readFileSync(cache.manifestPath, "utf-8")
    ) as ContentArtifactCacheManifest
    const expectedArtifacts = [...GENERATED_ARTIFACTS]
    if (
      manifest.formatVersion !== CACHE_FORMAT_VERSION ||
      manifest.key !== cache.key ||
      manifest.nodeVersion !== process.versions.node ||
      JSON.stringify(manifest.artifacts) !== JSON.stringify(expectedArtifacts)
    ) {
      logger.warn("content-cache.restore", {
        outcome: "miss",
        reason: "invalid-manifest",
      })
      return false
    }

    const listing = runTar(["-tzf", cache.archivePath])
    if (!listing.ok) {
      logger.warn(
        "content-cache.restore",
        { outcome: "miss", reason: "unreadable" },
        listing.output
      )
      return false
    }

    const unexpectedEntry = validateArchiveEntries(
      listing.output.split("\n").filter(Boolean)
    )
    if (unexpectedEntry) {
      logger.warn(
        "content-cache.restore",
        {
          outcome: "miss",
          reason: "unexpected-entry",
        },
        unexpectedEntry
      )
      return false
    }

    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "gtmc-content-cache-")
    )
    try {
      const extracted = runTar([
        "-xzf",
        cache.archivePath,
        "-C",
        temporaryDirectory,
      ])
      if (!extracted.ok) {
        logger.warn(
          "content-cache.restore",
          { outcome: "miss", reason: "extract-failed" },
          extracted.output
        )
        return false
      }

      const missingArtifact = hasEveryGeneratedArtifact(temporaryDirectory)
      if (missingArtifact) {
        logger.warn(
          "content-cache.restore",
          { outcome: "miss", reason: "missing-artifact" },
          missingArtifact
        )
        return false
      }

      for (const relativePath of GENERATED_ARTIFACTS) {
        const sourcePath = path.join(temporaryDirectory, relativePath)
        const targetPath = path.join(process.cwd(), relativePath)
        if (GENERATED_ARTIFACT_DIRECTORIES.has(relativePath)) {
          fs.rmSync(targetPath, { recursive: true, force: true })
        } else {
          fs.rmSync(targetPath, { force: true })
        }
        fs.mkdirSync(path.dirname(targetPath), { recursive: true })
        fs.cpSync(sourcePath, targetPath, { recursive: true })
      }
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true })
    }

    logger.event("content-cache.restore", {
      cache_id: getCacheId(cache),
      outcome: "hit",
    })
    return true
  } catch (error) {
    logger.warn(
      "content-cache.restore",
      { outcome: "miss", reason: "exception" },
      String(error)
    )
    return false
  }
}

export function saveContentArtifacts(cache: ContentArtifactCache): void {
  try {
    const missingArtifact = hasEveryGeneratedArtifact(process.cwd())
    if (missingArtifact) {
      logger.warn(
        "content-cache.save",
        { outcome: "skipped", reason: "missing-artifact" },
        missingArtifact
      )
      return
    }

    fs.mkdirSync(CACHE_DIRECTORY, { recursive: true })
    const temporaryArchivePath = `${cache.archivePath}.${process.pid}.tmp`
    const temporaryManifestPath = `${cache.manifestPath}.${process.pid}.tmp`
    try {
      const archived = runTar([
        "-czf",
        temporaryArchivePath,
        ...GENERATED_ARTIFACTS,
      ])
      if (!archived.ok) {
        logger.warn(
          "content-cache.save",
          { outcome: "failed", reason: "archive-failed" },
          archived.output
        )
        return
      }

      const manifest: ContentArtifactCacheManifest = {
        formatVersion: CACHE_FORMAT_VERSION,
        key: cache.key,
        artifacts: GENERATED_ARTIFACTS,
        nodeVersion: process.versions.node,
      }
      fs.writeFileSync(
        temporaryManifestPath,
        `${JSON.stringify(manifest)}\n`,
        "utf-8"
      )
      fs.renameSync(temporaryArchivePath, cache.archivePath)
      fs.renameSync(temporaryManifestPath, cache.manifestPath)
      logger.event("content-cache.save", {
        cache_id: getCacheId(cache),
        outcome: "saved",
      })
    } finally {
      fs.rmSync(temporaryArchivePath, { force: true })
      fs.rmSync(temporaryManifestPath, { force: true })
    }
  } catch (error) {
    logger.warn(
      "content-cache.save",
      { outcome: "failed", reason: "exception" },
      String(error)
    )
  }
}
