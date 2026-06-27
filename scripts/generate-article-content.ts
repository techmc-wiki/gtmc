import { createHash } from "node:crypto"
import fs from "fs"
import path from "path"

import { ARTICLES_PATH } from "@/lib/articles/fs"
import { loadArticleManifest } from "@/lib/articles/manifest"
import type { ArticleEntry, ArticleLocale } from "@/lib/articles/manifest"
import { artifactFilename } from "@/lib/articles/content"
import type { ArticleContentArtifact } from "@/lib/articles/content"
import {
  isLocalArticleAssetPath,
  resolveArticleAssetPath,
} from "@/lib/articles/banner-assets"
import {
  parseSourceFrontMatter,
  parseTranslationFrontMatter,
} from "@/lib/articles/frontmatter-parser"
import type {
  SourceFrontMatter,
  TranslationFrontMatter,
} from "@/lib/articles/frontmatter-parser"

const OUTPUT_DIR = path.join(process.cwd(), "data", "articles")
const TEMP_DIR = path.join(process.cwd(), "data", "articles.tmp")
const PUBLIC_ARTICLE_ASSET_DIR = path.join(
  process.cwd(),
  "public",
  "article-assets"
)
const CACHE_FILE = path.join(process.cwd(), "data", ".content-cache.json")
const IS_PRODUCTION = process.env.NODE_ENV !== "development"

/**
 * Incremental-build cache. Keyed by the article's path relative to the
 * articles submodule root; value is the truncated SHA-1 of the source bytes.
 * Lives under `data/` (gitignored) so it persists across local rebuilds.
 * On a fresh checkout (e.g. Vercel) the file is absent and every article is
 * regenerated, matching prior behaviour.
 */
type ContentCache = Record<string, { hash: string }>

function loadCache(): ContentCache {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8")
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ContentCache
    }
  } catch {}
  return {}
}

function saveCache(cache: ContentCache): void {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + "\n")
}

function shouldRegenerate(
  fileContent: string,
  cacheKey: string,
  cache: ContentCache
): { regenerate: boolean; hash: string } {
  const hash = createHash("sha1").update(fileContent).digest("hex").slice(0, 16)
  const cached = cache[cacheKey]
  if (cached?.hash === hash) {
    return { regenerate: false, hash }
  }
  cache[cacheKey] = { hash }
  return { regenerate: true, hash }
}

function readCachedFrontmatter(
  prevOutputPath: string,
  tempOutputPath: string
): Record<string, unknown> | null {
  try {
    fs.copyFileSync(prevOutputPath, tempOutputPath)
    const prev = JSON.parse(
      fs.readFileSync(prevOutputPath, "utf-8")
    ) as ArticleContentArtifact
    return prev.frontmatter
  } catch {
    return null
  }
}

/**
 * Strip YAML frontmatter delimited by `---` and return the body text.
 */
function stripFrontMatter(raw: string): string {
  const idx = raw.indexOf("\n---\n")
  if (raw.startsWith("---\n") && idx !== -1) {
    return raw.slice(idx + 5)
  }
  return raw
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

function main(): void {
  let generatedCount = 0
  let reusedCount = 0
  let errorCount = 0

  const cache = loadCache()
  const seenKeys = new Set<string>()

  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true })
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true })

  if (fs.existsSync(PUBLIC_ARTICLE_ASSET_DIR)) {
    fs.rmSync(PUBLIC_ARTICLE_ASSET_DIR, { recursive: true })
  }

  const entries = Object.values(loadArticleManifest())

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
      const cacheKey = `${locale}:${localizedPath}`
      seenKeys.add(cacheKey)

      const localeDir = path.join(TEMP_DIR, locale)
      fs.mkdirSync(localeDir, { recursive: true })
      const filename = `${artifactFilename(entry.slug)}.json`
      const tempOutputPath = path.join(localeDir, filename)
      const prevOutputPath = path.join(OUTPUT_DIR, locale, filename)

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

      const { regenerate } = shouldRegenerate(fileContent, cacheKey, cache)

      const cachedFrontmatter =
        !regenerate && fs.existsSync(prevOutputPath)
          ? readCachedFrontmatter(prevOutputPath, tempOutputPath)
          : null

      if (cachedFrontmatter) {
        copyBannerAssetToPublic(
          cachedFrontmatter.banner as { src: string } | undefined,
          localizedPath
        )
        reusedCount++
        continue
      }

      const rendered = renderArtifact(
        entry,
        locale,
        localizedPath,
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
          process.exit(1)
        }
      }
    }
  }

  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true })
  }
  fs.renameSync(TEMP_DIR, OUTPUT_DIR)

  for (const key of Object.keys(cache)) {
    if (!seenKeys.has(key)) {
      delete cache[key]
    }
  }
  saveCache(cache)

  process.stdout.write(
    `Generated ${generatedCount} article content artifacts, reused ${reusedCount} from cache\n`
  )

  if (errorCount > 0) {
    process.exit(1)
  }
}

function renderArtifact(
  entry: ArticleEntry,
  locale: string,
  localizedPath: string,
  fileContent: string,
  outputPath: string
): Record<string, unknown> | null {
  let artifactContent: string
  let frontmatter: Record<string, unknown>

  if (locale === "zh") {
    let fm: SourceFrontMatter
    try {
      fm = parseSourceFrontMatter(fileContent, {
        allowTitlelessFolder: entry.isFolder,
      })
    } catch (error) {
      process.stderr.write(
        `Error: Failed to parse source frontmatter for "${entry.slug}" (${locale}): ${(error as Error).message}\n`
      )
      return null
    }

    artifactContent = stripFrontMatter(fileContent)
    frontmatter = {
      title: fm.title,
      ...(fm["chapter-title"] && {
        "chapter-title": fm["chapter-title"],
      }),
      ...(fm["intro-title"] && { "intro-title": fm["intro-title"] }),
      ...(fm.description && { description: fm.description }),
      index: fm.index,
      ...(fm["is-advanced"] !== undefined && {
        "is-advanced": fm["is-advanced"],
      }),
      ...(fm.banner && { banner: fm.banner }),
      author: entry.author || undefined,
      coAuthors: entry.coAuthors || undefined,
      created: entry.created || undefined,
      lastmod: entry.lastmodByLocale.zh || undefined,
    }
  } else if (locale === "en") {
    let fm: TranslationFrontMatter
    try {
      fm = parseTranslationFrontMatter(fileContent)
    } catch (error) {
      process.stderr.write(
        `Error: Failed to parse translation frontmatter for "${entry.slug}" (${locale}): ${(error as Error).message}\n`
      )
      return null
    }

    artifactContent = stripFrontMatter(fileContent)
    frontmatter = {
      ...(fm.title && { title: fm.title }),
      ...(fm["chapter-title"] && {
        "chapter-title": fm["chapter-title"],
      }),
      ...(fm["intro-title"] && { "intro-title": fm["intro-title"] }),
      ...(fm.description && { description: fm.description }),
      ...(fm.banner && { banner: fm.banner }),
      translatedFromRevision: fm["translated-from-revision"],
      translationFreshness: entry.translationFreshnessByLocale.en || undefined,
      created: entry.created || undefined,
      lastmod: entry.lastmodByLocale.en || undefined,
      index: entry.index >= 0 ? entry.index : undefined,
      ...(entry.isAdvanced !== undefined && {
        isAdvanced: entry.isAdvanced,
      }),
      author: entry.author || undefined,
      coAuthors: entry.coAuthors || undefined,
      ...(!fm.banner &&
        entry.bannerByLocale?.zh && { banner: entry.bannerByLocale.zh }),
    }
  } else {
    return null
  }

  const artifact: ArticleContentArtifact = {
    slug: entry.slug,
    locale: locale as ArticleLocale,
    filePath: localizedPath,
    content: artifactContent,
    frontmatter,
  }

  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n")
  return frontmatter
}

main()
