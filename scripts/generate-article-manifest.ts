import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { parseFrontMatter } from "@/lib/frontmatter-parser"
import { ARTICLES_PATH } from "@/lib/article-fs-constants"
import { MANIFEST_FILE_NAME } from "@/lib/article-manifest-constants"
import type { ArticleEntry } from "@/lib/slug-resolver"
import { SLUG_REGEX } from "@/lib/slug-validator"
import { shouldIgnoreDirectory, shouldIgnoreFile } from "@/lib/article-ignore"

const OUTPUT_FILE = path.join(process.cwd(), "data", MANIFEST_FILE_NAME)
const MAX_DEPTH = 3
const TREE_PREVIEW_DEPTH = 3
const TREE_PREVIEW_CHILD_LIMIT = 12

type ArticleManifest = Record<string, ArticleEntry>
type ArticleLocale = "zh" | "en"

const ARTICLE_LOCALE_ORDER: ArticleLocale[] = ["zh", "en"]

function detectLocale(filename: string): ArticleLocale {
  if (filename.endsWith(".en.md")) return "en"
  if (filename.endsWith(".zh.md")) return "zh"
  return "zh"
}

function stripLocaleSuffix(filename: string): string {
  return filename.replace(/\.(en|zh)\.md$/i, ".md")
}

function isReadmeLocaleFile(filename: string): boolean {
  return /^README(?:\.(?:en|zh))?\.md$/i.test(filename)
}

function getEntryLocale(entry: ArticleEntry): ArticleLocale {
  return entry.availableLocales[0] ?? "zh"
}

function getManifestConflictPath(
  manifest: ArticleManifest,
  slug: string,
  locale: ArticleLocale
): string | undefined {
  return Object.values(manifest).find(
    (entry) => entry.slug === slug && entry.availableLocales.includes(locale)
  )?.filePath
}

function addManifestEntry(
  manifest: ArticleManifest,
  entry: ArticleEntry
): void {
  if (manifest[entry.slug] === undefined) {
    manifest[entry.slug] = entry
    return
  }

  const locale = getEntryLocale(entry)
  let index = 1
  let storageKey = `${entry.slug}::${locale}`
  while (manifest[storageKey] !== undefined) {
    index += 1
    storageKey = `${entry.slug}::${locale}:${index}`
  }

  manifest[storageKey] = entry
}

function markSlugSeen(
  slugsSeen: Map<string, Map<ArticleLocale, string>>,
  slug: string,
  locale: ArticleLocale,
  filename: string
): string | undefined {
  const localeFiles = slugsSeen.get(slug) ?? new Map<ArticleLocale, string>()
  const conflictFile = localeFiles.get(locale)
  if (conflictFile !== undefined) return conflictFile

  localeFiles.set(locale, filename)
  slugsSeen.set(slug, localeFiles)
  return undefined
}

function getFrontMatterEntry(
  filePath: string,
  slug: string,
  relativePath: string,
  locale: ArticleLocale,
  isFolder: boolean,
  parentSlug?: string
): ArticleEntry {
  const content = fs.readFileSync(filePath, "utf-8")
  const fm = parseFrontMatter(content)
  const title = fm.title ?? ""
  const chapterTitle = fm.chapterTitle ?? ""
  const chapterTitleEn = fm.chapterTitleEn ?? ""
  const introTitle = fm.introTitle ?? ""
  const introTitleEn = fm.introTitleEn ?? ""
  const author = fm.author ?? ""
  const coAuthors =
    fm.coAuthors && fm.coAuthors !== ""
      ? fm.coAuthors
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      : undefined

  return {
    filePath: relativePath,
    slug,
    title: title === "" ? undefined : title,
    titleEn: fm.titleEn,
    availableLocales: [locale],
    localizedFilePaths: { [locale]: relativePath },
    chapterTitle,
    chapterTitleEn,
    introTitle,
    introTitleEn,
    hasIntro: introTitle !== "" || introTitleEn !== "",
    index: fm.index,
    isFolder,
    isAppendix:
      /(^|\/)appendix(\/|$)/i.test(slug) ||
      /(^|\/)appendix(\/|$)/i.test(relativePath),
    isPreface:
      /(^|\/)preface(\/|$)/i.test(slug) || /^preface\.md$/i.test(relativePath),
    children: undefined,
    parentSlug,
    author: author === "" ? undefined : author,
    coAuthors,
    date: fm.date ?? undefined,
    lastmod: fm.lastmod ?? undefined,
    isAdvanced: fm.isAdvanced ?? undefined,
  }
}

function getParentSlug(slug: string): string | undefined {
  const parts = slug.split("/")
  if (parts.length <= 1) {
    return undefined
  }
  return parts.slice(0, -1).join("/")
}

function getSlugFromFile(filePath: string): string | null {
  const content = fs.readFileSync(filePath, "utf-8")
  const { data } = matter(content)
  return typeof data.slug === "string" ? data.slug : null
}

/**
 * Recursively processes a content directory and adds article entries to the manifest.
 *
 * @param dirPath          - Absolute path to the directory
 * @param relFromArticles  - Relative path from articles/ root (e.g. "SlimeTech/Molforte")
 * @param slugPrefix       - Accumulated slug path prefix (e.g. "slime-tech/molforte")
 * @param depth            - Current depth (1 = top-level folder inside articles/)
 * @param manifest          - Output manifest to populate
 * @returns true if any validation errors occurred
 */
function processDirectory(
  dirPath: string,
  relFromArticles: string,
  slugPrefix: string,
  depth: number,
  manifest: ArticleManifest
): boolean {
  let hasError = false

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const readmeFiles = entries
    .filter((entry) => entry.isFile() && isReadmeLocaleFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))

  for (const readmeFile of readmeFiles) {
    const readmePath = path.join(dirPath, readmeFile)
    const readmeLocale = detectLocale(readmeFile)
    const readmeSlug = getSlugFromFile(readmePath) ?? ""

    if (readmeSlug !== "") {
      const existingPath = getManifestConflictPath(
        manifest,
        slugPrefix,
        readmeLocale
      )
      if (existingPath !== undefined) {
        process.stderr.write(
          `Error: Duplicate composite slug "${slugPrefix}" for locale "${readmeLocale}": ` +
            `articles/${relFromArticles}/${readmeFile} ` +
            `(conflicts with articles/${existingPath} after slug flattening)\n`
        )
        hasError = true
      } else {
        const parentSlug = getParentSlug(slugPrefix)
        addManifestEntry(
          manifest,
          getFrontMatterEntry(
            readmePath,
            slugPrefix,
            `${relFromArticles}/${readmeFile}`,
            readmeLocale,
            true,
            parentSlug
          )
        )
      }
    }
  }

  const articleFiles = entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".md") &&
        !isReadmeLocaleFile(e.name) &&
        !shouldIgnoreFile(e.name, false)
    )
    .map((e) => e.name)

  const slugsSeen = new Map<string, Map<ArticleLocale, string>>()

  for (const articleFile of articleFiles) {
    const articlePath = path.join(dirPath, articleFile)
    const relPath = `${relFromArticles}/${articleFile}`
    const articleLocale = detectLocale(articleFile)

    const articleSlug = getSlugFromFile(articlePath)

    // Articles without slug frontmatter are silently skipped (not routable)
    if (articleSlug === null) {
      continue
    }

    if (!SLUG_REGEX.test(articleSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${articleSlug}" in: articles/${relPath}\n`
      )
      hasError = true
      continue
    }

    const conflictFile = markSlugSeen(
      slugsSeen,
      articleSlug,
      articleLocale,
      articleFile
    )
    if (conflictFile !== undefined) {
      process.stderr.write(
        `Error: Duplicate slug "${articleSlug}" for locale "${articleLocale}" in ${slugPrefix}: ` +
          `articles/${relPath} ` +
          `(conflicts with articles/${relFromArticles}/${conflictFile})\n`
      )
      hasError = true
      continue
    }

    const compositeSlug = `${slugPrefix}/${articleSlug}`

    const existingPath = getManifestConflictPath(
      manifest,
      compositeSlug,
      articleLocale
    )
    if (existingPath !== undefined) {
      process.stderr.write(
        `Error: Duplicate composite slug "${compositeSlug}" for locale "${articleLocale}": ` +
          `articles/${relPath} ` +
          `(conflicts with articles/${existingPath} after slug flattening)\n`
      )
      hasError = true
      continue
    }

    const parentSlug = getParentSlug(compositeSlug)
    addManifestEntry(
      manifest,
      getFrontMatterEntry(
        articlePath,
        compositeSlug,
        `${relFromArticles}/${articleFile}`,
        articleLocale,
        false,
        parentSlug
      )
    )
  }

  const subDirs = entries.filter(
    (e) => e.isDirectory() && !shouldIgnoreDirectory(e.name)
  )

  for (const subDirEntry of subDirs) {
    const subDirPath = path.join(dirPath, subDirEntry.name)
    const subRelPath = `${relFromArticles}/${subDirEntry.name}`

    if (depth >= MAX_DEPTH) {
      process.stderr.write(
        `Error: Directory nesting exceeds maximum depth of ${MAX_DEPTH}: ` +
          `articles/${subRelPath}\n`
      )
      hasError = true
      continue
    }

    const subReadmePath = path.join(subDirPath, "README.md")

    // Skip directories without README.md (images, raw asset dirs, etc.)
    if (!fs.existsSync(subReadmePath)) {
      continue
    }

    const subSlug = getSlugFromFile(subReadmePath) ?? ""

    // Allow empty string slug in subdirectories (depth >= 1) to flatten the slug path
    if (subSlug === "" || subSlug === null) {
      if (depth < 1) {
        process.stderr.write(
          `Error: Empty slug not allowed in top-level folder: articles/${subRelPath}/README.md\n`
        )
        hasError = true
        continue
      }
      // Use current slugPrefix as-is (skip this directory segment)
      const subError = processDirectory(
        subDirPath,
        subRelPath,
        slugPrefix,
        depth + 1,
        manifest
      )
      if (subError) hasError = true
      continue
    }

    if (!SLUG_REGEX.test(subSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${subSlug}" in: articles/${subRelPath}/README.md\n`
      )
      hasError = true
      continue
    }

    const subSlugPrefix = `${slugPrefix}/${subSlug}`
    const subError = processDirectory(
      subDirPath,
      subRelPath,
      subSlugPrefix,
      depth + 1,
      manifest
    )
    if (subError) hasError = true
  }

  return hasError
}

function buildGenerationSummary(manifest: ArticleManifest): string {
  const entries = Object.values(manifest)
  const folders = entries.filter((entry) => entry.isFolder)
  const articles = entries.filter((entry) => !entry.isFolder)
  const roots = entries
    .filter(
      (entry) => !entry.parentSlug || manifest[entry.parentSlug] === undefined
    )
    .sort(comparePreviewEntries)
  const maxSlugDepth = entries.reduce(
    (max, entry) => Math.max(max, entry.slug.split("/").length),
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

function mergeLocalizedManifestEntries(
  manifest: ArticleManifest
): ArticleManifest {
  const entriesBySlug = new Map<string, ArticleEntry[]>()

  for (const entry of Object.values(manifest)) {
    const entries = entriesBySlug.get(entry.slug) ?? []
    entries.push(entry)
    entriesBySlug.set(entry.slug, entries)
  }

  const mergedManifest: ArticleManifest = {}
  for (const [slug, entries] of entriesBySlug) {
    mergedManifest[slug] = mergeLocalizedEntries(slug, entries)
  }

  return mergedManifest
}

function mergeLocalizedEntries(
  slug: string,
  entries: ArticleEntry[]
): ArticleEntry {
  const zhEntry = entries.find((entry) => entry.availableLocales.includes("zh"))
  const enEntry = entries.find((entry) => entry.availableLocales.includes("en"))
  const baseEntry = zhEntry ?? entries[0]
  const localizedFilePaths: Partial<Record<ArticleLocale, string>> = {}

  for (const locale of ARTICLE_LOCALE_ORDER) {
    const localizedEntry = entries.find((entry) =>
      entry.availableLocales.includes(locale)
    )
    const localizedPath = localizedEntry?.localizedFilePaths[locale]
    if (localizedPath !== undefined) {
      localizedFilePaths[locale] = localizedPath
    } else if (localizedEntry !== undefined) {
      localizedFilePaths[locale] = localizedEntry.filePath
    }
  }

  const availableLocales = ARTICLE_LOCALE_ORDER.filter(
    (locale) => localizedFilePaths[locale] !== undefined
  )

  return {
    ...baseEntry,
    filePath: localizedFilePaths.zh ?? baseEntry.filePath,
    slug,
    title: zhEntry?.title ?? baseEntry.title,
    titleEn: enEntry?.titleEn ?? baseEntry.titleEn,
    availableLocales,
    localizedFilePaths,
    children: mergeChildren(entries),
  }
}

function mergeChildren(entries: ArticleEntry[]): ArticleEntry[] | undefined {
  const childrenBySlug = new Map<string, ArticleEntry>()
  for (const entry of entries) {
    for (const child of entry.children ?? []) {
      if (!childrenBySlug.has(child.slug)) {
        childrenBySlug.set(child.slug, child)
      }
    }
  }

  const children = Array.from(childrenBySlug.values())
  return children.length > 0 ? children : undefined
}

function countFlagged(
  entries: ArticleEntry[],
  field: "isPreface" | "isAppendix" | "isAdvanced" | "hasIntro"
): number {
  return entries.filter((entry) => entry[field]).length
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

    const children = [...(entry.children ?? [])].sort(comparePreviewEntries)
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
  if (a.isFolder !== b.isFolder) {
    return a.isFolder ? -1 : 1
  }

  const indexA = a.index >= 0 ? a.index : Number.MAX_SAFE_INTEGER
  const indexB = b.index >= 0 ? b.index : Number.MAX_SAFE_INTEGER
  if (indexA !== indexB) {
    return indexA - indexB
  }

  return getPreviewTitle(a).localeCompare(getPreviewTitle(b), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function getPreviewTitle(entry: ArticleEntry): string {
  return (
    entry.chapterTitle ||
    entry.title ||
    entry.chapterTitleEn ||
    entry.introTitle ||
    entry.introTitleEn ||
    entry.filePath.split("/").pop()?.replace(/\.md$/i, "") ||
    entry.slug
  )
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}...`
}

function indent(depth: number): string {
  return "  ".repeat(depth)
}

function main(): void {
  let manifest: ArticleManifest = {}
  let hasError = false

  if (!fs.existsSync(ARTICLES_PATH)) {
    process.stderr.write(
      `Error: articles/ directory not found at ${ARTICLES_PATH}\n`
    )
    process.exit(1)
  }

  const topLevelFolders = fs
    .readdirSync(ARTICLES_PATH, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !shouldIgnoreDirectory(e.name))
    .map((e) => e.name)

  for (const folderName of topLevelFolders) {
    const folderPath = path.join(ARTICLES_PATH, folderName)
    const readmePath = path.join(folderPath, "README.md")

    if (!fs.existsSync(readmePath)) {
      process.stderr.write(
        `Error: Missing README.md in folder: articles/${folderName}/README.md\n`
      )
      hasError = true
      continue
    }

    const folderSlug = getSlugFromFile(readmePath)

    if (folderSlug === null || folderSlug === "") {
      process.stderr.write(
        `Error: Missing slug in folder README: articles/${folderName}/README.md\n`
      )
      hasError = true
      continue
    }

    if (!SLUG_REGEX.test(folderSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${folderSlug}" in: articles/${folderName}/README.md\n`
      )
      hasError = true
      continue
    }

    const folderError = processDirectory(
      folderPath,
      folderName,
      folderSlug,
      1,
      manifest
    )
    if (folderError) hasError = true
  }

  const folderSlugKeys = new Set(Object.keys(manifest))

  const rootFiles = fs
    .readdirSync(ARTICLES_PATH, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".md") &&
        !isReadmeLocaleFile(e.name) &&
        !shouldIgnoreFile(e.name, true)
    )
    .map((e) => e.name)

  const rootSlugsSeen = new Map<string, Map<ArticleLocale, string>>()

  for (const rootFile of rootFiles) {
    const rootFilePath = path.join(ARTICLES_PATH, rootFile)
    const rootLocale = detectLocale(rootFile)
    const rawSlug = getSlugFromFile(rootFilePath)

    let key: string
    if (rawSlug !== null && rawSlug !== "") {
      if (!SLUG_REGEX.test(rawSlug)) {
        process.stderr.write(
          `Error: Invalid slug format "${rawSlug}" in: articles/${rootFile}\n`
        )
        hasError = true
        continue
      }
      key = rawSlug
    } else {
      key = stripLocaleSuffix(rootFile).replace(/\.md$/, "")
    }

    const conflictFile = markSlugSeen(rootSlugsSeen, key, rootLocale, rootFile)
    if (conflictFile !== undefined) {
      process.stderr.write(
        `Error: Duplicate root article key "${key}" for locale "${rootLocale}": articles/${rootFile} ` +
          `(conflicts with articles/${conflictFile})\n`
      )
      hasError = true
      continue
    }

    const folderConflictPath = getManifestConflictPath(
      manifest,
      key,
      rootLocale
    )
    if (folderSlugKeys.has(key) && folderConflictPath !== undefined) {
      process.stderr.write(
        `Error: Root article key "${key}" for locale "${rootLocale}" ` +
          `(articles/${rootFile}) conflicts with an existing folder article slug at ` +
          `articles/${folderConflictPath}\n`
      )
      hasError = true
      continue
    }

    addManifestEntry(
      manifest,
      getFrontMatterEntry(
        rootFilePath,
        key,
        rootFile,
        rootLocale,
        false,
        undefined
      )
    )
  }

  manifest = mergeLocalizedManifestEntries(manifest)

  for (const entry of Object.values(manifest)) {
    entry.children = undefined
  }

  for (const [slug, entry] of Object.entries(manifest)) {
    const parent = entry.parentSlug
    if (!parent || manifest[parent] === undefined) {
      continue
    }
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
