import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { SLUG_REGEX } from "../lib/slug-validator"
import { shouldIgnoreDirectory, shouldIgnoreFile } from "../lib/article-ignore"

const ARTICLES_DIR = path.join(process.cwd(), "articles")
const OUTPUT_FILE = path.join(process.cwd(), "lib", "slug-map.json")
const MAX_DEPTH = 3

interface SlugMap {
  [compositeSlug: string]: string
}

function getSlugFromFile(filePath: string): string | null {
  const content = fs.readFileSync(filePath, "utf-8")
  const { data } = matter(content)
  return typeof data.slug === "string" ? data.slug : null
}

/**
 * Recursively processes a content directory and adds article slugs to slugMap.
 *
 * @param dirPath          - Absolute path to the directory
 * @param relFromArticles  - Relative path from articles/ root (e.g. "SlimeTech/Molforte")
 * @param slugPrefix       - Accumulated slug path prefix (e.g. "slime-tech/molforte")
 * @param depth            - Current depth (1 = top-level folder inside articles/)
 * @param slugMap          - Output map to populate
 * @returns true if any validation errors occurred
 */
function processDirectory(
  dirPath: string,
  relFromArticles: string,
  slugPrefix: string,
  depth: number,
  slugMap: SlugMap
): boolean {
  let hasError = false

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

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
    slugMap[compositeSlug] = `${relFromArticles}/${articleFile}`
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

    const subSlug = getSlugFromFile(subReadmePath)

    if (subSlug === null) {
      process.stderr.write(
        `Error: Missing slug in folder README: articles/${subRelPath}/README.md\n`
      )
      hasError = true
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
      slugMap
    )
    if (subError) hasError = true
  }

  return hasError
}

function main(): void {
  const slugMap: SlugMap = {}
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

    if (folderSlug === null) {
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
      slugMap
    )
    if (folderError) hasError = true
  }

  const folderSlugKeys = new Set(Object.keys(slugMap))

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
    slugMap[key] = rootFile
  }

  if (hasError) {
    process.stderr.write(
      "\nSlug map generation failed due to validation errors above.\n"
    )
    process.exit(1)
  }

  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(slugMap, null, 2) + "\n")

  const entryCount = Object.keys(slugMap).length
  process.stdout.write(`Generated slug-map.json with ${entryCount} entries\n`)
}

main()
