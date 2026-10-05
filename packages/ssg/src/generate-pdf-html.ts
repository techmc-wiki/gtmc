import fs from "fs"
import path from "path"

import type { ArticleEntry } from "./articles/types"
import {
  artifactFilename,
  type ArticleContentArtifact,
} from "./articles/content"
import { renderMarkdownToHtml } from "./markdown/pdf-html"
import {
  createRehypeShiki,
  persistHighlightCache,
  type RehypeShikiPlugin,
} from "./markdown/syntax/rehype-shiki"
import type { BuildLogger } from "./logger"

export interface PdfHtmlOptions {
  /** Directory holding `manifest.json` and the generated `articles/` artifacts. */
  dataDir: string
  /** Directory that receives the `<locale>/<slug>.html` sidecars. */
  htmlDir: string
  /** Shiki highlight cache shared with the site render. */
  highlightCachePath: string
  logger: BuildLogger
}

/**
 * Render every generated article artifact into the HTML that pdfgen prints.
 *
 * This consumes the artifacts written by `generateArticleContent` rather than
 * the article sources, so the PDF body and the site always describe the same
 * content, and so PDF-only work stays out of the site's content build.
 */
export async function generatePdfHtml({
  dataDir,
  htmlDir,
  highlightCachePath,
  logger,
}: PdfHtmlOptions): Promise<void> {
  const TEMP_DIR = `${htmlDir}.tmp`
  let generatedCount = 0
  let errorCount = 0

  fs.rmSync(TEMP_DIR, { recursive: true, force: true })
  fs.mkdirSync(TEMP_DIR, { recursive: true })

  const shikiPlugin = await createRehypeShiki(highlightCachePath)
  const entries = Object.values(
    JSON.parse(
      fs.readFileSync(path.join(dataDir, "manifest.json"), "utf-8")
    ) as Record<string, ArticleEntry>
  )

  const renderJobs = entries.flatMap((entry) => {
    if (
      !entry.filePath.endsWith(".md") ||
      (entry.isFolder && !entry.hasIntro)
    ) {
      return []
    }
    return Object.keys(entry.localizedFilePaths).map(
      (locale) => () => renderSidecar(entry, locale, shikiPlugin)
    )
  })

  await Promise.all(renderJobs.map((job) => job()))

  fs.rmSync(htmlDir, { recursive: true, force: true })
  fs.renameSync(TEMP_DIR, htmlDir)

  persistHighlightCache(highlightCachePath)

  logger.event("pdf-html.generated", { generated_count: generatedCount })

  if (errorCount > 0) {
    throw new Error("PDF HTML generation failed")
  }

  async function renderSidecar(
    entry: ArticleEntry,
    locale: string,
    highlightPlugin: RehypeShikiPlugin
  ): Promise<void> {
    const filename = `${artifactFilename(entry.slug)}.json`
    const artifactPath = path.join(dataDir, "articles", locale, filename)

    let artifact: ArticleContentArtifact
    try {
      artifact = JSON.parse(
        fs.readFileSync(artifactPath, "utf-8")
      ) as ArticleContentArtifact
    } catch (error) {
      logger.error(
        "pdf-html.artifact.read-failed",
        { locale, slug: entry.slug },
        `${artifactPath}: ${String(error)}`
      )
      errorCount++
      return
    }

    try {
      const html = await renderMarkdownToHtml(artifact.content, {
        articleSlug: entry.slug,
        codeReferences: artifact.codeReferences,
        locale: locale as "en" | "zh",
        shikiPlugin: highlightPlugin,
      })
      const localeDir = path.join(TEMP_DIR, locale)
      fs.mkdirSync(localeDir, { recursive: true })
      fs.writeFileSync(
        path.join(localeDir, `${artifactFilename(entry.slug)}.html`),
        html
      )
      generatedCount++
    } catch (error) {
      logger.error(
        "pdf-html.render-failed",
        { locale, slug: entry.slug },
        String(error)
      )
      errorCount++
    }
  }
}
