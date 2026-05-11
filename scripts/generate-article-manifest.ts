import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { parseFrontMatter } from "@/lib/frontmatter-parser"
import { MANIFEST_FILE_NAME } from "@/lib/article-manifest-constants"
import type { ArticleEntry } from "@/lib/slug-resolver"
import { SLUG_REGEX } from "@/lib/slug-validator"
import { shouldIgnoreDirectory, shouldIgnoreFile } from "@/lib/article-ignore"

const ARTICLES_DIR = path.join(process.cwd(), "articles")
const OUTPUT_FILE = path.join(process.cwd(), "lib", MANIFEST_FILE_NAME)
const MAX_DEPTH = 3
const TREE_PREVIEW_DEPTH = 3
const TREE_PREVIEW_CHILD_LIMIT = 12

type ArticleManifest = Record<string, ArticleEntry>

function getFrontMatterEntry(
  filePath: string,
  slug: string,
  relativePath: string,
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
  const readmePath = path.join(dirPath, "README.md")

  if (fs.existsSync(readmePath)) {
    const readmeSlug = getSlugFromFile(readmePath) ?? ""

    if (readmeSlug !== "") {
      if (manifest[slugPrefix] !== undefined) {
        const existingPath = manifest[slugPrefix].filePath
        process.stderr.write(
          `Error: Duplicate composite slug "${slugPrefix}": articles/${relFromArticles}/README.md ` +
            `(conflicts with articles/${existingPath} after slug flattening)\n`
        )
        hasError = true
      } else {
        const parentSlug = getParentSlug(slugPrefix)
        manifest[slugPrefix] = getFrontMatterEntry(
          readmePath,
          slugPrefix,
          `${relFromArticles}/README.md`,
          true,
          parentSlug
        )
      }
    }
  }

  const articleFiles = entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".md") &&
        e.name !== "README.md" &&
        !shouldIgnoreFile(e.name, false)
    )
    .map((e) => e.name)

  const slugsSeen = new Map<string, string>()

  for (const articleFile of articleFiles) {
    const articlePath = path.join(dirPath, articleFile)
    const relPath = `${relFromArticles}/${articleFile}`

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

    if (slugsSeen.has(articleSlug)) {
      const conflictFile = slugsSeen.get(articleSlug)!
      process.stderr.write(
        `Error: Duplicate slug "${articleSlug}" in ${slugPrefix}: articles/${relPath} ` +
          `(conflicts with articles/${relFromArticles}/${conflictFile})\n`
      )
      hasError = true
      continue
    }

    slugsSeen.set(articleSlug, articleFile)

    const compositeSlug = `${slugPrefix}/${articleSlug}`

    if (manifest[compositeSlug] !== undefined) {
      const existingPath = manifest[compositeSlug].filePath
      process.stderr.write(
        `Error: Duplicate composite slug "${compositeSlug}": articles/${relPath} ` +
          `(conflicts with articles/${existingPath} after slug flattening)\n`
      )
      hasError = true
      continue
    }

    const parentSlug = getParentSlug(compositeSlug)
    manifest[compositeSlug] = getFrontMatterEntry(
      articlePath,
      compositeSlug,
      `${relFromArticles}/${articleFile}`,
      false,
      parentSlug
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
    `Source: ${path.relative(process.cwd(), ARTICLES_DIR) || "."}`,
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
  const manifest: ArticleManifest = {}
  let hasError = false

  if (!fs.existsSync(ARTICLES_DIR)) {
    process.stderr.write(
      `Error: articles/ directory not found at ${ARTICLES_DIR}\n`
    )
    process.exit(1)
  }

  const topLevelFolders = fs
    .readdirSync(ARTICLES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !shouldIgnoreDirectory(e.name))
    .map((e) => e.name)

  for (const folderName of topLevelFolders) {
    const folderPath = path.join(ARTICLES_DIR, folderName)
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
    .readdirSync(ARTICLES_DIR, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".md") &&
        e.name !== "README.md" &&
        !shouldIgnoreFile(e.name, true)
    )
    .map((e) => e.name)

  const rootSlugsSeen = new Map<string, string>()

  for (const rootFile of rootFiles) {
    const rootFilePath = path.join(ARTICLES_DIR, rootFile)
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
      key = rootFile.replace(/\.md$/, "")
    }

    if (rootSlugsSeen.has(key)) {
      const conflictFile = rootSlugsSeen.get(key)!
      process.stderr.write(
        `Error: Duplicate root article key "${key}": articles/${rootFile} ` +
          `(conflicts with articles/${conflictFile})\n`
      )
      hasError = true
      continue
    }

    if (folderSlugKeys.has(key)) {
      process.stderr.write(
        `Error: Root article key "${key}" (articles/${rootFile}) conflicts with ` +
          `an existing folder article slug\n`
      )
      hasError = true
      continue
    }

    rootSlugsSeen.set(key, rootFile)
    manifest[key] = getFrontMatterEntry(
      rootFilePath,
      key,
      rootFile,
      false,
      undefined
    )
  }

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
