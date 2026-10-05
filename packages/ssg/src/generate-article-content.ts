import fs from "fs"
import path from "path"

import type { ArticleEntry } from "./articles/types"
import { artifactFilename } from "./articles/content"
import type { ArticleContentArtifact } from "./articles/content"
import {
  isLocalArticleAssetPath,
  resolveArticleAssetPath,
} from "./articles/article-asset-path"
import {
  parseSourceReadmeFrontMatter,
  parseSourceFrontMatter,
  parseTranslationReadmeFrontMatter,
  parseTranslationFrontMatter,
} from "./articles/frontmatter-parser"
import type {
  SourceReadmeFrontMatter,
  SourceFrontMatter,
  TranslationReadmeFrontMatter,
  TranslationFrontMatter,
} from "./articles/frontmatter-parser"
import { analyzeJavaCodeReferences } from "./markdown/code-provenance.server"
import type { BuildLogger } from "./logger"

export interface ArticleContentOptions {
  articlesPath: string
  dataDir: string
  articleAssetDir: string
  production: boolean
  logger: BuildLogger
}

function stripFrontMatter(raw: string): string {
  const normalized = raw.startsWith("\uFEFF") ? raw.slice(1) : raw
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(normalized)
  if (match) {
    return normalized.slice(match[0].length)
  }
  return normalized
}

export async function generateArticleContent({
  articlesPath,
  dataDir,
  articleAssetDir,
  production,
  logger,
}: ArticleContentOptions): Promise<void> {
  const OUTPUT_DIR = path.join(dataDir, "articles")
  const TEMP_DIR = path.join(dataDir, "articles.tmp")
  const PUBLIC_ARTICLE_ASSET_DIR = articleAssetDir
  const ARTICLES_PATH = articlesPath
  const IS_PRODUCTION = production

  function copyBannerAssetToPublic(
    banner: { src: string } | undefined,
    articleFilePath: string
  ): void {
    const resolvedBannerPath = resolveArticleAssetPath(
      banner?.src,
      articleFilePath
    )
    if (!resolvedBannerPath) return
    if (!isLocalArticleAssetPath(resolvedBannerPath)) return

    const sourcePath = path.join(ARTICLES_PATH, resolvedBannerPath)
    const targetPath = path.join(PUBLIC_ARTICLE_ASSET_DIR, resolvedBannerPath)

    const relativeTargetPath = path.relative(
      PUBLIC_ARTICLE_ASSET_DIR,
      targetPath
    )
    if (
      relativeTargetPath === ".." ||
      relativeTargetPath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeTargetPath)
    ) {
      return
    }

    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.copyFileSync(sourcePath, targetPath)
    } catch {
      // Runtime routes can use the repository URL when a local banner is unavailable.
    }
  }

  let generatedCount = 0
  let errorCount = 0

  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true })
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true })

  if (fs.existsSync(PUBLIC_ARTICLE_ASSET_DIR)) {
    fs.rmSync(PUBLIC_ARTICLE_ASSET_DIR, { recursive: true })
  }

  const entries = Object.values(
    JSON.parse(
      fs.readFileSync(path.join(dataDir, "manifest.json"), "utf-8")
    ) as Record<string, ArticleEntry>
  )
  const renderJobs: Array<() => Promise<void>> = []

  for (const entry of entries) {
    if (
      !entry.filePath.endsWith(".md") ||
      (entry.isFolder && !entry.hasIntro)
    ) {
      continue
    }

    for (const [locale, localizedPath] of Object.entries(
      entry.localizedFilePaths
    )) {
      const sourcePath = path.join(ARTICLES_PATH, localizedPath)

      const localeDir = path.join(TEMP_DIR, locale)
      fs.mkdirSync(localeDir, { recursive: true })
      const filename = `${artifactFilename(entry.slug)}.json`
      const tempOutputPath = path.join(localeDir, filename)

      let fileContent: string
      try {
        fileContent = fs.readFileSync(sourcePath, "utf-8")
      } catch {
        logger.error(
          "article-content.source.read-failed",
          {
            locale,
            slug: entry.slug,
          },
          sourcePath
        )
        errorCount++
        if (IS_PRODUCTION) {
          throw new Error("Article content generation failed")
        }
        continue
      }

      renderJobs.push(async () => {
        const rendered = await renderArtifact(
          entry,
          locale,
          fileContent,
          tempOutputPath
        )
        if (rendered) {
          copyBannerAssetToPublic(
            rendered.banner as { src: string } | undefined,
            localizedPath
          )
          generatedCount++
        } else {
          errorCount++
          if (IS_PRODUCTION) {
            throw new Error("Article content generation failed")
          }
        }
      })
    }
  }

  await Promise.all(renderJobs.map((job) => job()))

  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true })
  }
  fs.renameSync(TEMP_DIR, OUTPUT_DIR)

  logger.event("article-content.generated", {
    generated_count: generatedCount,
  })

  if (errorCount > 0) {
    throw new Error("Article content generation failed")
  }

  async function renderArtifact(
    entry: ArticleEntry,
    locale: string,
    fileContent: string,
    outputPath: string
  ): Promise<Record<string, unknown> | null> {
    let artifactContent: string
    let frontmatter: Record<string, unknown>

    if (locale === "zh") {
      let fm: SourceFrontMatter | SourceReadmeFrontMatter
      try {
        fm = entry.isFolder
          ? parseSourceReadmeFrontMatter(fileContent)
          : parseSourceFrontMatter(fileContent)
      } catch (error) {
        logger.error(
          "article-content.frontmatter.parse-failed",
          { locale, slug: entry.slug, type: "source" },
          String(error)
        )
        return null
      }

      artifactContent = stripFrontMatter(fileContent)
      const chapterTitle =
        "chapter-title" in fm ? fm["chapter-title"] : undefined
      const introTitle = "intro-title" in fm ? fm["intro-title"] : undefined
      frontmatter = {
        ...("title" in fm && { title: fm.title }),
        ...(chapterTitle && {
          "chapter-title": chapterTitle,
        }),
        ...(introTitle && { "intro-title": introTitle }),
        ...("description" in fm &&
          fm.description && { description: fm.description }),
        index: fm.index,
        ...("is-advanced" in fm &&
          fm["is-advanced"] !== undefined && {
            "is-advanced": fm["is-advanced"],
          }),
        ...("banner" in fm && fm.banner && { banner: fm.banner }),
        author: entry.author || undefined,
        coAuthors: entry.coAuthors || undefined,
        created: entry.created || undefined,
        lastmod: entry.lastmodByLocale.zh || undefined,
      }
    } else if (locale === "en") {
      let fm: TranslationFrontMatter | TranslationReadmeFrontMatter
      try {
        fm = entry.isFolder
          ? parseTranslationReadmeFrontMatter(fileContent)
          : parseTranslationFrontMatter(fileContent)
      } catch (error) {
        logger.error(
          "article-content.frontmatter.parse-failed",
          { locale, slug: entry.slug, type: "translation" },
          String(error)
        )
        return null
      }

      artifactContent = stripFrontMatter(fileContent)
      const chapterTitle =
        "chapter-title" in fm ? fm["chapter-title"] : undefined
      const introTitle = "intro-title" in fm ? fm["intro-title"] : undefined
      frontmatter = {
        ...("title" in fm && fm.title && { title: fm.title }),
        ...(chapterTitle && {
          "chapter-title": chapterTitle,
        }),
        ...(introTitle && { "intro-title": introTitle }),
        ...("description" in fm &&
          fm.description && { description: fm.description }),
        ...("banner" in fm && fm.banner && { banner: fm.banner }),
        translatedFromRevision: entry.translatedFromRevisionByLocale.en,
        translationFreshness:
          entry.translationFreshnessByLocale.en || undefined,
        created: entry.created || undefined,
        lastmod: entry.lastmodByLocale.en || undefined,
        index: entry.index >= 0 ? entry.index : undefined,
        ...(entry.isAdvanced !== undefined && {
          isAdvanced: entry.isAdvanced,
        }),
        author: entry.author || undefined,
        coAuthors: entry.coAuthors || undefined,
        ...(!("banner" in fm && fm.banner) &&
          entry.bannerByLocale?.zh && { banner: entry.bannerByLocale.zh }),
      }
    } else {
      return null
    }

    let codeReferences
    try {
      codeReferences = analyzeJavaCodeReferences(artifactContent)
    } catch (error) {
      logger.error(
        "article-content.code-provenance.invalid",
        { locale, slug: entry.slug },
        String(error)
      )
      return null
    }

    const artifact: ArticleContentArtifact = {
      content: artifactContent,
      frontmatter,
      codeReferences,
      ...(locale === "en" && entry.translationStatusByLocale?.en
        ? { translationStatus: entry.translationStatusByLocale.en }
        : {}),
    }

    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n")

    return frontmatter
  }
}
