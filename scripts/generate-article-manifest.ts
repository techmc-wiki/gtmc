import fs from "fs"
import path from "path"
import Ajv2020, { type AnySchema } from "ajv/dist/2020"
import type { ArticleEntry } from "@/lib/articles/manifest"

import { shouldIgnoreDirectory, shouldIgnoreFile } from "@/lib/articles/ignore"
import {
  parseSourceFrontMatter,
  parseTranslationFrontMatter,
  type SourceFrontMatter,
} from "@/lib/frontmatter-parser"
import {
  loadMaintainers,
  loadAuthorAliases,
  getArticleAuthors,
  getArticleDates,
  isAncestor,
  getHeadSha,
} from "@/lib/git-metadata"

const MANIFEST_FILE_NAME = "manifest.json"
const ARTICLES_PATH = path.join(process.cwd(), "articles")
const OUTPUT_FILE = path.join(process.cwd(), "data", MANIFEST_FILE_NAME)
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_DEPTH = 3
const TREE_PREVIEW_DEPTH = 3
const TREE_PREVIEW_CHILD_LIMIT = 12

type ArticleManifest = Record<string, ArticleEntry>

let ajv: Ajv2020
let validateFrontmatter: ReturnType<Ajv2020["compile"]>

function isReadmeLocaleFile(filename: string): boolean {
  return /^README(?:\.\w{2})?\.md$/i.test(filename)
}

async function initAjv(): Promise<void> {
  ajv = new Ajv2020({ strict: false })
  const schemaPath = path.join(
    process.cwd(),
    "scripts",
    "article-frontmatter.schema.json"
  )
  const schemaContent = fs.readFileSync(schemaPath, "utf-8")
  const schema = normalizeNullableOptionalFields(
    JSON.parse(schemaContent)
  ) as AnySchema
  validateFrontmatter = ajv.compile(schema)
}

function normalizeNullableOptionalFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeNullableOptionalFields)
  }

  if (typeof value !== "object" || value === null) {
    return value
  }

  const input = value as Record<string, unknown>
  const output: Record<string, unknown> = {}

  for (const [key, childValue] of Object.entries(input)) {
    output[key] = normalizeNullableOptionalFields(childValue)
  }

  if (output.type === "string") {
    output.type = ["string", "null"]
  }

  return output
}

function sanitizeForSchema<T extends object>(
  value: T
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  )
}

function getParentSlug(slug: string): string | undefined {
  const parts = slug.split("/")
  if (parts.length <= 1) return undefined
  return parts.slice(0, -1).join("/")
}

function resolveSourceSlug(slugPrefix: string, articleSlug: string): string {
  if (slugPrefix === "") return articleSlug
  return slugPrefix === articleSlug
    ? articleSlug
    : `${slugPrefix}/${articleSlug}`
}

function getParentSlugFromRelPath(relPath: string): string {
  const segments = path.dirname(relPath).split(path.sep).filter(Boolean)
  const slugs: string[] = []

  for (const segment of segments) {
    const readmeZhPath = path.join(
      ARTICLES_PATH,
      ...slugsToPath(segments, slugs.length),
      segment,
      "README.zh.md"
    )
    const readmePath = path.join(
      ARTICLES_PATH,
      ...slugsToPath(segments, slugs.length),
      segment,
      "README.md"
    )
    const readmeSource = fs.existsSync(readmeZhPath)
      ? readmeZhPath
      : fs.existsSync(readmePath)
        ? readmePath
        : null

    if (!readmeSource) continue

    const slug = getSlugFromFile(readmeSource)
    if (slug) slugs.push(slug)
  }

  return slugs.join("/")
}

function slugsToPath(segments: string[], length: number): string[] {
  return segments.slice(0, length)
}

async function processSourceFile(
  filePath: string,
  relPath: string,
  slug: string,
  isFolder: boolean,
  parentSlug: string | undefined,
  repoCwd: string,
  maintainers: string[],
  aliases: Map<string, string>
): Promise<Partial<ArticleEntry>> {
  const content = fs.readFileSync(filePath, "utf-8")

  let fm: SourceFrontMatter
  try {
    fm = parseSourceFrontMatter(content, { allowTitlelessFolder: isFolder })
    if (!validateFrontmatter(sanitizeForSchema(fm))) {
      const errors = validateFrontmatter.errors || []
      const errorMsg = errors
        .map((e) => `${e.instancePath} ${e.message}`)
        .join(", ")
      throw new Error(`${relPath}: validation failed: ${errorMsg}`)
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes("legacy key") || errMsg.includes("unknown key")) {
      throw new Error(`${relPath}: ${errMsg}`, { cause: err })
    }
    throw err
  }

  const { author, coAuthors } = await getArticleAuthors(
    repoCwd,
    relPath,
    maintainers,
    aliases
  )
  const { created, lastmod } = await getArticleDates(
    repoCwd,
    relPath,
    maintainers
  )

  const entry: Partial<ArticleEntry> = {
    filePath: relPath,
    slug,
    titleByLocale: { zh: fm.title },
    availableLocales: ["zh"],
    localizedFilePaths: { zh: relPath },
    chapterTitleByLocale: fm["chapter-title"]
      ? { zh: fm["chapter-title"] }
      : {},
    introTitleByLocale: fm["intro-title"] ? { zh: fm["intro-title"] } : {},
    descriptionByLocale: fm.description ? { zh: fm.description } : {},
    hasIntro: !!fm["intro-title"],
    index: fm.index,
    isFolder,
    isAppendix:
      /(^|\/)appendix(\/|$)/i.test(slug) ||
      /(^|\/)appendix(\/|$)/i.test(relPath),
    isPreface:
      /(^|\/)preface(\/|$)/i.test(slug) || /^preface\.zh\.md$/i.test(relPath),
    parentSlug,
    author: author || undefined,
    coAuthors: coAuthors.length > 0 ? coAuthors : undefined,
    created: created || undefined,
    lastmodByLocale: lastmod ? { zh: lastmod } : {},
    translatedFromRevisionByLocale: {},
    translationFreshnessByLocale: {},
    isAdvanced: fm["is-advanced"],
  }

  if (fm.banner) {
    entry.bannerByLocale = { zh: fm.banner }
  }

  return entry
}

async function processTranslationFile(
  filePath: string,
  relPath: string,
  repoCwd: string,
  maintainers: string[],
  manifest: ArticleManifest
): Promise<void> {
  const content = fs.readFileSync(filePath, "utf-8")
  const fm = parseTranslationFrontMatter(content)

  if (!validateFrontmatter(sanitizeForSchema(fm))) {
    const errors = validateFrontmatter.errors || []
    const errorMsg = errors
      .map((e) => `${e.instancePath} ${e.message}`)
      .join(", ")
    throw new Error(`${relPath}: validation failed: ${errorMsg}`)
  }

  const dirPath = path.dirname(filePath)
  const translatesPath = path.join(dirPath, fm.translates)

  if (!fs.existsSync(translatesPath)) {
    throw new Error(
      `${relPath}: translates field points to non-existent file: ${fm.translates}`
    )
  }

  const translatesRelPath = path.relative(ARTICLES_PATH, translatesPath)
  const sourceContent = fs.readFileSync(translatesPath, "utf-8")
  const sourceFm = parseSourceFrontMatter(sourceContent, {
    allowTitlelessFolder: isReadmeLocaleFile(path.basename(translatesPath)),
  })
  const sourceSlug = sourceFm.slug
  const sourceParentSlug = getParentSlugFromRelPath(translatesRelPath)
  const resolvedSourceSlug = isReadmeLocaleFile(path.basename(translatesPath))
    ? sourceParentSlug
    : resolveSourceSlug(sourceParentSlug, sourceSlug)

  const entry = manifest[resolvedSourceSlug]
  if (!entry) {
    throw new Error(
      `${relPath}: source slug "${resolvedSourceSlug}" not found in manifest`
    )
  }

  const { lastmod } = await getArticleDates(repoCwd, relPath, maintainers)

  if (!entry.availableLocales.includes("en")) {
    entry.availableLocales.push("en")
  }
  entry.localizedFilePaths.en = relPath

  if (fm.title) entry.titleByLocale.en = fm.title
  if (fm["chapter-title"]) entry.chapterTitleByLocale.en = fm["chapter-title"]
  if (fm["intro-title"]) {
    entry.introTitleByLocale.en = fm["intro-title"]
    entry.hasIntro = true
  }
  if (fm.description) entry.descriptionByLocale.en = fm.description
  if (fm.banner) {
    if (!entry.bannerByLocale) entry.bannerByLocale = {}
    entry.bannerByLocale.en = fm.banner
  }

  if (lastmod) entry.lastmodByLocale.en = lastmod

  entry.translatedFromRevisionByLocale.en = fm["translated-from-revision"]

  try {
    const headSha = await getHeadSha(repoCwd)
    const sourceHeadSha = await getHeadSha(repoCwd)

    if (fm["translated-from-revision"] === sourceHeadSha) {
      entry.translationFreshnessByLocale.en = "fresh"
    } else {
      const isAnc = await isAncestor(
        repoCwd,
        fm["translated-from-revision"],
        headSha
      )
      entry.translationFreshnessByLocale.en = isAnc ? "stale" : "unknown"
    }
  } catch {
    entry.translationFreshnessByLocale.en = "unknown"
  }
}

function getSlugFromFile(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    const fm = parseSourceFrontMatter(content, { allowTitlelessFolder: true })
    return fm.slug || null
  } catch {
    return null
  }
}

async function processDirectory(
  dirPath: string,
  relFromArticles: string,
  slugPrefix: string,
  depth: number,
  manifest: ArticleManifest,
  repoCwd: string,
  maintainers: string[],
  aliases: Map<string, string>
): Promise<boolean> {
  let hasError = false

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  const readmeZh = entries.find((e) => e.isFile() && e.name === "README.zh.md")
  const readmeFallback = entries.find(
    (e) => e.isFile() && e.name === "README.md"
  )
  const readmeSource = readmeZh || readmeFallback

  if (readmeSource) {
    const readmePath = path.join(dirPath, readmeSource.name)
    const readmeSlug = getSlugFromFile(readmePath)

    if (readmeSlug) {
      const parentSlug = getParentSlug(slugPrefix)
      try {
        const entry = await processSourceFile(
          readmePath,
          `${relFromArticles}/${readmeSource.name}`,
          slugPrefix,
          true,
          parentSlug,
          repoCwd,
          maintainers,
          aliases
        )
        manifest[slugPrefix] = entry as ArticleEntry
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`
        )
        hasError = true
      }
    }
  }

  const sourceFiles = entries.filter(
    (e) =>
      e.isFile() &&
      (e.name.endsWith(".zh.md") ||
        (e.name.endsWith(".md") && !e.name.endsWith(".en.md"))) &&
      !isReadmeLocaleFile(e.name) &&
      !shouldIgnoreFile(e.name, false)
  )

  const sourceFileJobs: Array<{
    sourcePath: string
    relPath: string
    compositeSlug: string
    parentSlug: string | undefined
  }> = []
  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(dirPath, sourceFile.name)
    const relPath = `${relFromArticles}/${sourceFile.name}`

    const articleSlug = getSlugFromFile(sourcePath)
    if (!articleSlug) {
      process.stderr.write(
        `WARN: Skipping file without slug: articles/${relPath}\n`
      )
      continue
    }

    if (!SLUG_REGEX.test(articleSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${articleSlug}" in: articles/${relPath}\n`
      )
      hasError = true
      continue
    }

    const compositeSlug = resolveSourceSlug(slugPrefix, articleSlug)
    const parentSlug = getParentSlug(compositeSlug)
    sourceFileJobs.push({ sourcePath, relPath, compositeSlug, parentSlug })
  }

  const sourceFileResults = await Promise.all(
    sourceFileJobs.map(
      async ({ sourcePath, relPath, compositeSlug, parentSlug }) => {
        try {
          const entry = await processSourceFile(
            sourcePath,
            relPath,
            compositeSlug,
            false,
            parentSlug,
            repoCwd,
            maintainers,
            aliases
          )
          return { compositeSlug, entry: entry as ArticleEntry, error: false }
        } catch (err) {
          process.stderr.write(
            `Error: ${err instanceof Error ? err.message : String(err)}\n`
          )
          return { compositeSlug, entry: null, error: true }
        }
      }
    )
  )
  for (const result of sourceFileResults) {
    if (result.entry) {
      manifest[result.compositeSlug] = result.entry
    }
    if (result.error) hasError = true
  }

  const readmeEn = entries.find((e) => e.isFile() && e.name === "README.en.md")
  if (readmeEn && manifest[slugPrefix]) {
    const readmePath = path.join(dirPath, readmeEn.name)
    try {
      await processTranslationFile(
        readmePath,
        `${relFromArticles}/${readmeEn.name}`,
        repoCwd,
        maintainers,
        manifest
      )
    } catch (err) {
      process.stderr.write(
        `Error: ${err instanceof Error ? err.message : String(err)}\n`
      )
      hasError = true
    }
  }

  const enFiles = entries.filter(
    (e) =>
      e.isFile() &&
      e.name.endsWith(".en.md") &&
      !isReadmeLocaleFile(e.name) &&
      !shouldIgnoreFile(e.name, false)
  )

  const enFileResults = await Promise.all(
    enFiles.map(async (enFile) => {
      const enPath = path.join(dirPath, enFile.name)
      const relPath = `${relFromArticles}/${enFile.name}`

      try {
        await processTranslationFile(
          enPath,
          relPath,
          repoCwd,
          maintainers,
          manifest
        )
        return false
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`
        )
        return true
      }
    })
  )
  if (enFileResults.some(Boolean)) hasError = true

  const subDirs = entries.filter(
    (e) => e.isDirectory() && !shouldIgnoreDirectory(e.name)
  )

  const subDirJobs: Array<() => Promise<boolean>> = []
  for (const subDirEntry of subDirs) {
    const subDirPath = path.join(dirPath, subDirEntry.name)
    const subRelPath = `${relFromArticles}/${subDirEntry.name}`

    if (depth >= MAX_DEPTH) {
      process.stderr.write(
        `Error: Directory nesting exceeds maximum depth of ${MAX_DEPTH}: articles/${subRelPath}\n`
      )
      hasError = true
      continue
    }

    const subReadmeZhPath = path.join(subDirPath, "README.zh.md")
    const subReadmePath = path.join(subDirPath, "README.md")
    const subReadmeExists = fs.existsSync(subReadmeZhPath)
      ? subReadmeZhPath
      : fs.existsSync(subReadmePath)
        ? subReadmePath
        : null

    if (!subReadmeExists) continue

    const subSlug = getSlugFromFile(subReadmeExists)
    if (!subSlug) {
      if (depth < 1) {
        process.stderr.write(
          `Error: Empty slug not allowed in top-level folder: articles/${subRelPath}/README.zh.md\n`
        )
        hasError = true
        continue
      }
      subDirJobs.push(() =>
        processDirectory(
          subDirPath,
          subRelPath,
          slugPrefix,
          depth + 1,
          manifest,
          repoCwd,
          maintainers,
          aliases
        )
      )
      continue
    }

    if (!SLUG_REGEX.test(subSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${subSlug}" in: articles/${subRelPath}/README.zh.md\n`
      )
      hasError = true
      continue
    }

    const subSlugPrefix = resolveSourceSlug(slugPrefix, subSlug)
    subDirJobs.push(() =>
      processDirectory(
        subDirPath,
        subRelPath,
        subSlugPrefix,
        depth + 1,
        manifest,
        repoCwd,
        maintainers,
        aliases
      )
    )
  }

  const subDirResults = await Promise.all(subDirJobs.map((job) => job()))
  if (subDirResults.some(Boolean)) hasError = true

  return hasError
}

function buildGenerationSummary(manifest: ArticleManifest): string {
  const entries = Object.values(manifest)
  const folders = entries.filter((e) => e.isFolder)
  const articles = entries.filter((e) => !e.isFolder)
  const roots = entries
    .filter((e) => !e.parentSlug || !manifest[e.parentSlug])
    .toSorted(comparePreviewEntries)
  const maxSlugDepth = entries.reduce(
    (max, e) => Math.max(max, e.slug.split("/").length),
    0
  )

  const summaryLines = [
    "[manifest] Article structure indexed",
    `Source: ${path.relative(process.cwd(), ARTICLES_PATH) || "."}`,
    `Output: ${path.relative(process.cwd(), OUTPUT_FILE) || OUTPUT_FILE}`,
    `Entries: ${entries.length} total (${folders.length} folders, ${articles.length} articles)`,
    `Roots: ${roots.length} | max slug depth: ${maxSlugDepth} | max directory depth: ${MAX_DEPTH}`,
    `Flags: ${countFlagged(entries, "isPreface")} preface, ${countFlagged(entries, "isAppendix")} appendix, ${countFlagged(entries, "isAdvanced")} advanced, ${countFlagged(entries, "hasIntro")} with intro`,
    "Legend: [dir] folder README, [doc] article, * advanced, + intro, ! preface/appendix",
    "",
    "Structure preview:",
  ]

  const previewLines = formatPreviewEntries(roots, 0)
  if (previewLines.length === 0) {
    previewLines.push("  (no routable articles found)")
  }

  return [...summaryLines, ...previewLines, ""].join("\n")
}

function countFlagged(
  entries: ArticleEntry[],
  field: "isPreface" | "isAppendix" | "isAdvanced" | "hasIntro"
): number {
  return entries.filter((e) => e[field]).length
}

function formatPreviewEntries(
  entries: ArticleEntry[],
  depth: number
): string[] {
  const visibleEntries = entries.slice(0, TREE_PREVIEW_CHILD_LIMIT)
  const lines: string[] = []
  const nextDepth = depth + 1

  for (const entry of visibleEntries) {
    lines.push(formatPreviewEntry(entry, depth))

    const children = [...(entry.children ?? [])].toSorted(comparePreviewEntries)
    if (children.length > 0) {
      if (nextDepth < TREE_PREVIEW_DEPTH) {
        lines.push(...formatPreviewEntries(children, nextDepth))
      } else {
        lines.push(
          `${indent(nextDepth)}... ${children.length} nested entries hidden`
        )
      }
    }
  }

  const hiddenCount = entries.length - visibleEntries.length
  if (hiddenCount > 0) {
    lines.push(`${indent(depth)}... ${hiddenCount} more entries`)
  }

  return lines
}

function formatPreviewEntry(entry: ArticleEntry, depth: number): string {
  const kind = entry.isFolder ? "dir" : "doc"
  const markers = [
    entry.isAdvanced ? "*" : "",
    entry.hasIntro ? "+" : "",
    entry.isPreface || entry.isAppendix ? "!" : "",
  ]
    .filter(Boolean)
    .join("")
  const markerSuffix = markers === "" ? "" : ` ${markers}`
  const indexSuffix = entry.index >= 0 ? ` #${entry.index}` : ""
  const childCount = entry.children?.length ?? 0
  const childSuffix = childCount > 0 ? `, ${childCount} children` : ""
  const title = truncate(getPreviewTitle(entry), 72)

  return `${indent(depth)}- [${kind}] ${title} <${entry.slug}>${indexSuffix}${markerSuffix}${childSuffix} @ articles/${entry.filePath}`
}

function comparePreviewEntries(a: ArticleEntry, b: ArticleEntry): number {
  if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1

  const indexA = a.index >= 0 ? a.index : Number.MAX_SAFE_INTEGER
  const indexB = b.index >= 0 ? b.index : Number.MAX_SAFE_INTEGER
  if (indexA !== indexB) return indexA - indexB

  return getPreviewTitle(a).localeCompare(getPreviewTitle(b), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function getPreviewTitle(entry: ArticleEntry): string {
  return (
    entry.chapterTitleByLocale.zh ||
    entry.titleByLocale.zh ||
    entry.chapterTitleByLocale.en ||
    entry.introTitleByLocale.zh ||
    entry.introTitleByLocale.en ||
    entry.filePath.split("/").pop()?.replace(/\.md$/i, "") ||
    entry.slug
  )
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}...`
}

function indent(depth: number): string {
  return "  ".repeat(depth)
}

async function main(): Promise<void> {
  await initAjv()

  let manifest: ArticleManifest = {}
  let hasError = false

  if (!fs.existsSync(ARTICLES_PATH)) {
    process.stderr.write(
      `Error: articles/ directory not found at ${ARTICLES_PATH}\n`
    )
    process.exit(1)
  }

  const maintainers = await loadMaintainers(ARTICLES_PATH)
  const aliases = await loadAuthorAliases(ARTICLES_PATH)

  const topLevelFolders = fs
    .readdirSync(ARTICLES_PATH, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !shouldIgnoreDirectory(e.name))
    .map((e) => e.name)

  const folderJobs: Array<{
    folderPath: string
    folderName: string
    folderSlug: string
  }> = []
  for (const folderName of topLevelFolders) {
    const folderPath = path.join(ARTICLES_PATH, folderName)
    const readmeZhPath = path.join(folderPath, "README.zh.md")
    const readmePath = path.join(folderPath, "README.md")
    const readmeExists = fs.existsSync(readmeZhPath)
      ? readmeZhPath
      : fs.existsSync(readmePath)
        ? readmePath
        : null

    if (!readmeExists) {
      process.stderr.write(
        `Error: Missing README.zh.md or README.md in folder: articles/${folderName}/\n`
      )
      hasError = true
      continue
    }

    const folderSlug = getSlugFromFile(readmeExists)

    if (!folderSlug) {
      process.stderr.write(
        `Error: Missing slug in folder README: articles/${folderName}/README.zh.md\n`
      )
      hasError = true
      continue
    }

    if (!SLUG_REGEX.test(folderSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${folderSlug}" in: articles/${folderName}/README.zh.md\n`
      )
      hasError = true
      continue
    }

    folderJobs.push({ folderPath, folderName, folderSlug })
  }

  const folderResults = await Promise.all(
    folderJobs.map(({ folderPath, folderName, folderSlug }) =>
      processDirectory(
        folderPath,
        folderName,
        folderSlug,
        1,
        manifest,
        ARTICLES_PATH,
        maintainers,
        aliases
      )
    )
  )
  if (folderResults.some(Boolean)) hasError = true

  const rootFiles = fs
    .readdirSync(ARTICLES_PATH, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        (e.name.endsWith(".zh.md") ||
          (e.name.endsWith(".md") && !e.name.endsWith(".en.md"))) &&
        !isReadmeLocaleFile(e.name) &&
        !shouldIgnoreFile(e.name, true)
    )
    .map((e) => e.name)

  const rootFileJobs: Array<{
    rootFilePath: string
    rootFile: string
    rawSlug: string
  }> = []
  for (const rootFile of rootFiles) {
    const rootFilePath = path.join(ARTICLES_PATH, rootFile)
    const rawSlug = getSlugFromFile(rootFilePath)

    if (!rawSlug) {
      process.stderr.write(
        `WARN: Skipping root file without slug: articles/${rootFile}\n`
      )
      continue
    }

    if (!SLUG_REGEX.test(rawSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${rawSlug}" in: articles/${rootFile}\n`
      )
      hasError = true
      continue
    }

    rootFileJobs.push({ rootFilePath, rootFile, rawSlug })
  }

  const rootFileResults = await Promise.all(
    rootFileJobs.map(async ({ rootFilePath, rootFile, rawSlug }) => {
      try {
        const entry = await processSourceFile(
          rootFilePath,
          rootFile,
          rawSlug,
          false,
          undefined,
          ARTICLES_PATH,
          maintainers,
          aliases
        )
        return { rawSlug, entry: entry as ArticleEntry, error: false }
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`
        )
        return { rawSlug, entry: null, error: true }
      }
    })
  )
  for (const result of rootFileResults) {
    if (result.entry) {
      manifest[result.rawSlug] = result.entry
    }
    if (result.error) hasError = true
  }

  const rootEnFiles = fs
    .readdirSync(ARTICLES_PATH, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".en.md") &&
        !isReadmeLocaleFile(e.name) &&
        !shouldIgnoreFile(e.name, true)
    )
    .map((e) => e.name)

  const rootEnFileResults = await Promise.all(
    rootEnFiles.map(async (rootEnFile) => {
      const rootEnPath = path.join(ARTICLES_PATH, rootEnFile)
      try {
        await processTranslationFile(
          rootEnPath,
          rootEnFile,
          ARTICLES_PATH,
          maintainers,
          manifest
        )
        return false
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`
        )
        return true
      }
    })
  )
  if (rootEnFileResults.some(Boolean)) hasError = true

  for (const entry of Object.values(manifest)) {
    entry.children = undefined
  }

  for (const [slug, entry] of Object.entries(manifest)) {
    const parent = entry.parentSlug
    if (!parent || !manifest[parent]) continue
    if (!manifest[parent].children) {
      manifest[parent].children = []
    }
    manifest[parent].children!.push(manifest[slug])
  }

  if (hasError) {
    process.stderr.write(
      "\nArticle manifest generation failed due to validation errors above.\n"
    )
    process.exit(1)
  }

  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2) + "\n")

  const entryCount = Object.keys(manifest).length
  process.stdout.write(buildGenerationSummary(manifest))
  process.stdout.write(
    `Generated ${MANIFEST_FILE_NAME} with ${entryCount} entries\n`
  )
}

main()
