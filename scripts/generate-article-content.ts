import fs from "fs"
import path from "path"
import matter from "gray-matter"

import { ARTICLES_PATH } from "@/lib/article-fs-constants"
import { ArticleManifest } from "@/lib/article-manifest-store"
import {
  artifactFilename,
  type ArticleContentArtifact,
} from "@/lib/article-content-artifact"

const OUTPUT_DIR = path.join(process.cwd(), "data", "articles")
const TEMP_DIR = path.join(process.cwd(), "data", "articles.tmp")
const IS_PRODUCTION = process.env.NODE_ENV !== "development"

function main(): void {
  let generatedCount = 0
  let errorCount = 0

  // Clean any leftover temp directory from a previous run
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true })
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true })

  const entries = Object.values(ArticleManifest)

  for (const entry of entries) {
    // Only process entries with .md filePath; skip folder README entries
    // (but keep folder entries with hasIntro: true — their README intro is an article page)
    if (
      !entry.filePath.endsWith(".md") ||
      (entry.isFolder && !entry.hasIntro)
    ) {
      continue
    }

    const sourcePath = path.join(ARTICLES_PATH, entry.filePath)

    let fileContent: string
    try {
      fileContent = fs.readFileSync(sourcePath, "utf-8")
    } catch {
      process.stderr.write(
        `Error: Cannot read source file for "${entry.slug}": ${sourcePath}\n`
      )
      errorCount++
      if (IS_PRODUCTION) {
        process.exit(1)
      }
      continue
    }

    const { data, content } = matter(fileContent)

    const artifact: ArticleContentArtifact = {
      slug: entry.slug,
      filePath: entry.filePath,
      content,
      frontmatter: data as Record<string, unknown>,
    }

    const filename = `${artifactFilename(entry.slug)}.json`
    const outputPath = path.join(TEMP_DIR, filename)

    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n")
    generatedCount++
  }

  // Atomically replace output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true })
  }
  fs.renameSync(TEMP_DIR, OUTPUT_DIR)

  process.stdout.write(
    `Generated ${generatedCount} article content artifacts\n`
  )

  if (errorCount > 0) {
    process.exit(1)
  }
}

main()
