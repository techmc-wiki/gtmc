import fs from "fs"
import path from "path"
import matter from "gray-matter"

import { ARTICLES_PATH } from "@/lib/article-fs-constants"
import { ArticleManifest } from "@/lib/article-manifest-store"
import type { ArticleLocale } from "@/lib/article-manifest"
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

  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true })
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true })

  const entries = Object.values(ArticleManifest)

  for (const entry of entries) {
    if (
      !entry.filePath.endsWith(".md") ||
      (entry.isFolder && !entry.hasIntro)
    ) {
      continue
    }

    for (const [locale, localizedPath] of Object.entries(entry.localizedFilePaths)) {
      const sourcePath = path.join(ARTICLES_PATH, localizedPath)

      let fileContent: string
      try {
        fileContent = fs.readFileSync(sourcePath, "utf-8")
      } catch {
        process.stderr.write(
          `Error: Cannot read source file for "${entry.slug}" (${locale}): ${sourcePath}\n`
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
        locale: locale as ArticleLocale,
        filePath: localizedPath,
        content,
        frontmatter: data as Record<string, unknown>,
      }

      const localeDir = path.join(TEMP_DIR, locale)
      fs.mkdirSync(localeDir, { recursive: true })

      const filename = `${artifactFilename(entry.slug)}.json`
      const outputPath = path.join(localeDir, filename)

      fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n")
      generatedCount++
    }
  }

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
