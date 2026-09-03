import fs from "fs"
import path from "path"

import { ARTICLES_PATH } from "@/lib/articles/fs"
import { loadArticleManifest } from "@/lib/articles/manifest"
import type { ArticleEntry } from "@/lib/articles/manifest"
import { artifactFilename } from "@/lib/articles/content"
import type { ArticleContentArtifact } from "@/lib/articles/content"
import {
  isLocalArticleAssetPath,
  resolveArticleAssetPath,
} from "@/lib/articles/article-asset-path"
import {
  parseSourceReadmeFrontMatter,
  parseSourceFrontMatter,
  parseTranslationReadmeFrontMatter,
  parseTranslationFrontMatter,
} from "@/lib/articles/frontmatter-parser"
import type {
  SourceReadmeFrontMatter,
  SourceFrontMatter,
  TranslationReadmeFrontMatter,
  TranslationFrontMatter,
} from "@/lib/articles/frontmatter-parser"
import { renderMarkdownToHtml } from "@/lib/markdown/pdf-html"
import { analyzeJavaCodeReferences } from "@/lib/markdown/code-provenance.server"
import {
  createRehypeShiki,
  persistHighlightCache,
  type RehypeShikiPlugin,
} from "@/lib/markdown/syntax/rehype-shiki"
import { createLogger } from "./lib/logger"

const logger = createLogger("article-content")

const OUTPUT_DIR = path.join(process.cwd(), "data", "articles")
const TEMP_DIR = path.join(process.cwd(), "data", "articles.tmp")
const PDF_HTML_DIR = path.join(process.cwd(), "data", "pdf-html")
const PDF_HTML_TEMP_DIR = path.join(process.cwd(), "data", "pdf-html.tmp")
const PUBLIC_ARTICLE_ASSET_DIR = path.join(
  process.cwd(),
  "public",
  "article-assets"
)
const IS_PRODUCTION = process.env.NODE_ENV !== "development"

/**
 * Strip YAML frontmatter delimited by `---` and return the body text.
 */
function stripFrontMatter(raw: string): string {
  const normalized = raw.startsWith("\uFEFF") ? raw.slice(1) : raw
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(normalized)
  if (match) {
    return normalized.slice(match[0].length)
  }
  return normalized
}

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

  const relativeTargetPath = path.relative(PUBLIC_ARTICLE_ASSET_DIR, targetPath)
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
    // Runtime banner routes can still fall back to the articles repository.
  }
}

async function mainAsync(): Promise<void> {
  let generatedCount = 0
  let errorCount = 0

  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true })
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true })

  if (fs.existsSync(PDF_HTML_TEMP_DIR)) {
    fs.rmSync(PDF_HTML_TEMP_DIR, { recursive: true })
  }
  fs.mkdirSync(PDF_HTML_TEMP_DIR, { recursive: true })

  if (fs.existsSync(PUBLIC_ARTICLE_ASSET_DIR)) {
    fs.rmSync(PUBLIC_ARTICLE_ASSET_DIR, { recursive: true })
  }

  const shikiPlugin = await createRehypeShiki()
  const entries = Object.values(loadArticleManifest())
  // Independent per-article renders (artifact JSON + PDF-HTML sidecar);
  // collected and run concurrently after the sync bookkeeping loop.
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
      const htmlFilename = `${artifactFilename(entry.slug)}.html`
      const pdfHtmlLocaleDir = path.join(PDF_HTML_TEMP_DIR, locale)
      fs.mkdirSync(pdfHtmlLocaleDir, { recursive: true })
      const tempHtmlPath = path.join(pdfHtmlLocaleDir, htmlFilename)

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
          process.exit(1)
        }
        continue
      }

      renderJobs.push(async () => {
        const rendered = await renderArtifact(
          entry,
          locale,
          localizedPath,
          fileContent,
          tempOutputPath,
          tempHtmlPath,
          shikiPlugin
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
            process.exit(1)
          }
        }
      })
    }
  }

  // Renders are independent per article — run them concurrently.
  await Promise.all(renderJobs.map((job) => job()))

  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true })
  }
  fs.renameSync(TEMP_DIR, OUTPUT_DIR)

  if (fs.existsSync(PDF_HTML_DIR)) {
    fs.rmSync(PDF_HTML_DIR, { recursive: true })
  }
  fs.renameSync(PDF_HTML_TEMP_DIR, PDF_HTML_DIR)

  persistHighlightCache()

  logger.event("article-content.generated", {
    generated_count: generatedCount,
  })

  if (errorCount > 0) {
    process.exit(1)
  }
}

async function renderArtifact(
  entry: ArticleEntry,
  locale: string,
  localizedPath: string,
  fileContent: string,
  outputPath: string,
  htmlOutputPath: string,
  shikiPlugin: RehypeShikiPlugin
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
    const chapterTitle = "chapter-title" in fm ? fm["chapter-title"] : undefined
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
    const chapterTitle = "chapter-title" in fm ? fm["chapter-title"] : undefined
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
      translationFreshness: entry.translationFreshnessByLocale.en || undefined,
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

  try {
    const html = await renderMarkdownToHtml(artifact.content, {
      articleSlug: entry.slug,
      codeReferences: artifact.codeReferences,
      locale: locale as "en" | "zh",
      shikiPlugin,
    })
    fs.mkdirSync(path.dirname(htmlOutputPath), { recursive: true })
    fs.writeFileSync(htmlOutputPath, html)
  } catch (error) {
    logger.error(
      "article-content.pdf-html.render-failed",
      { locale, slug: entry.slug },
      String(error)
    )
    return null
  }

  return frontmatter
}

void mainAsync()
