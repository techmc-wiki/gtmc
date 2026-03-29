import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { SLUG_REGEX } from "../lib/slug-validator"

const ARTICLES_DIR = path.join(process.cwd(), "articles")
const OUTPUT_FILE = path.join(process.cwd(), "lib", "slug-map.json")

interface SlugMap {
  [compositeSlug: string]: string
}

function getSlugFromFile(filePath: string): string | null {
  const content = fs.readFileSync(filePath, "utf-8")
  const { data } = matter(content)
  return typeof data.slug === "string" ? data.slug : null
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

  const folders = fs
    .readdirSync(ARTICLES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  for (const folderName of folders) {
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

    const articleFiles = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          entry.name !== "README.md"
      )
      .map((entry) => entry.name)

    const folderSlugsSeen = new Map<string, string>()

    for (const articleFile of articleFiles) {
      const articlePath = path.join(folderPath, articleFile)
      const relPath = `${folderName}/${articleFile}`

      const articleSlug = getSlugFromFile(articlePath)

      if (articleSlug === null) {
        process.stderr.write(
          `Error: Missing slug in article: articles/${relPath}\n`
        )
        hasError = true
        continue
      }

      if (!SLUG_REGEX.test(articleSlug)) {
        process.stderr.write(
          `Error: Invalid slug format "${articleSlug}" in: articles/${relPath}\n`
        )
        hasError = true
        continue
      }

      if (folderSlugsSeen.has(articleSlug)) {
        const conflictFile = folderSlugsSeen.get(articleSlug)!
        process.stderr.write(
          `Error: Duplicate slug "${articleSlug}" in folder ${folderSlug}: articles/${relPath} (conflicts with articles/${folderName}/${conflictFile})\n`
        )
        hasError = true
        continue
      }

      folderSlugsSeen.set(articleSlug, articleFile)

      const compositeSlug = `${folderSlug}/${articleSlug}`
      slugMap[compositeSlug] = relPath
    }
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
