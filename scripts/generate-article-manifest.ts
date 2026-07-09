import fs from "fs"
import path from "path"
import { spawnSync } from "node:child_process"
import type { ArticleEntry } from "@/lib/articles/manifest"

import { shouldIgnoreDirectory, shouldIgnoreFile } from "@/lib/articles/ignore"
import { buildGenerationSummary } from "./manifest-preview"
import {
  parseSourceReadmeFrontMatter,
  parseSourceFrontMatter,
  parseTranslationReadmeFrontMatter,
  parseTranslationFrontMatter,
  type SourceReadmeFrontMatter,
  type SourceFrontMatter,
  type TranslationReadmeFrontMatter,
  type TranslationFrontMatter,
} from "@/lib/articles/frontmatter-parser"
import {
  loadMaintainers,
  loadAuthorAliases,
  getArticleAuthors,
  getArticleDates,
  isAncestor,
  getHeadSha,
  hasPathChangedSince,
} from "@/lib/articles/git-metadata"

const MANIFEST_FILE_NAME = "manifest.json"
const ARTICLES_PATH =
  process.env.ARTICLES_PATH ?? path.join(process.cwd(), "articles")
const OUTPUT_FILE = path.join(process.cwd(), "data", MANIFEST_FILE_NAME)
const ARTICLES_REPO_URL = "https://github.com/techmc-wiki/Articles.git"
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_DEPTH = 3

type ArticleManifest = Record<string, ArticleEntry>

function isReadmeLocaleFile(filename: string): boolean {
  return /^README(?:\.\w{2})?\.md$/i.test(filename)
}

function parseSourceMetadata(
  content: string,
  isReadme: boolean
): SourceFrontMatter | SourceReadmeFrontMatter {
  return isReadme
    ? parseSourceReadmeFrontMatter(content)
    : parseSourceFrontMatter(content)
}

function parseTranslationMetadata(
  content: string,
  isReadme: boolean
): TranslationFrontMatter | TranslationReadmeFrontMatter {
  return isReadme
    ? parseTranslationReadmeFrontMatter(content)
    : parseTranslationFrontMatter(content)
}

function getParentSlug(slug: string): string | undefined {
  const parts = slug.split("/")
  if (parts.length <= 1) return undefined
  return parts.slice(0, -1).join("/")
}

function resolveSourceSlug(slugPrefix: string, articleSlug: string): string {
  if (slugPrefix === "") return articleSlug
  return slugPrefix === articleSlug
    ? articleSlug
    : `${slugPrefix}/${articleSlug}`
}

function getParentSlugFromRelPath(relPath: string): string {
  const segments = path.dirname(relPath).split(path.sep).filter(Boolean)
  const slugs: string[] = []

  for (const segment of segments) {
    const readmeZhPath = path.join(
      ARTICLES_PATH,
      ...slugsToPath(segments, slugs.length),
      segment,
      "README.zh.md"
    )
    const readmePath = path.join(
      ARTICLES_PATH,
      ...slugsToPath(segments, slugs.length),
      segment,
      "README.md"
    )
    const readmeSource = fs.existsSync(readmeZhPath)
      ? readmeZhPath
      : fs.existsSync(readmePath)
        ? readmePath
        : null

    if (!readmeSource) continue

    const slug = tryReadSlugFromFile(readmeSource)
    if (slug) slugs.push(slug)
  }

  return slugs.join("/")
}

function slugsToPath(segments: string[], length: number): string[] {
  return segments.slice(0, length)
}

async function processSourceFile(
  filePath: string,
  relPath: string,
  slug: string,
  isFolder: boolean,
  parentSlug: string | undefined,
  repoCwd: string,
  maintainers: string[],
  aliases: Map<string, string>
): Promise<Partial<ArticleEntry>> {
  const content = fs.readFileSync(filePath, "utf-8")

  let fm: SourceFrontMatter | SourceReadmeFrontMatter
  try {
    fm = parseSourceMetadata(content, isFolder)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg.includes("unknown key")) {
      throw new Error(`${relPath}: ${errMsg}`, { cause: error })
    }
    throw error
  }

  const { author, coAuthors } = await getArticleAuthors(
    repoCwd,
    relPath,
    maintainers,
    aliases
  )
  const { created, lastmod } = await getArticleDates(
    repoCwd,
    relPath,
    maintainers
  )
  const chapterTitle = "chapter-title" in fm ? fm["chapter-title"] : undefined
  const introTitle = "intro-title" in fm ? fm["intro-title"] : undefined

  const entry: Partial<ArticleEntry> = {
    filePath: relPath,
    slug,
    titleByLocale: "title" in fm ? { zh: fm.title } : {},
    availableLocales: ["zh"],
    localizedFilePaths: { zh: relPath },
    chapterTitleByLocale: chapterTitle ? { zh: chapterTitle } : {},
    introTitleByLocale: introTitle ? { zh: introTitle } : {},
    descriptionByLocale:
      "description" in fm && fm.description ? { zh: fm.description } : {},
    hasIntro: !!introTitle,
    index: fm.index,
    isFolder,
    isAppendix:
      /(^|\/)appendix(\/|$)/i.test(slug) ||
      /(^|\/)appendix(\/|$)/i.test(relPath),
    isPreface:
      /(^|\/)preface(\/|$)/i.test(slug) || /^preface\.zh\.md$/i.test(relPath),
    parentSlug,
    author: author || undefined,
    coAuthors: coAuthors.length > 0 ? coAuthors : undefined,
    created: created || undefined,
    lastmodByLocale: lastmod ? { zh: lastmod } : {},
    translatedFromRevisionByLocale: {},
    translationFreshnessByLocale: {},
    isAdvanced: "is-advanced" in fm ? fm["is-advanced"] : undefined,
  }

  if ("banner" in fm && fm.banner) {
    entry.bannerByLocale = { zh: fm.banner }
  }

  return entry
}

async function processTranslationFile(
  filePath: string,
  relPath: string,
  repoCwd: string,
  maintainers: string[],
  manifest: ArticleManifest
): Promise<void> {
  const content = fs.readFileSync(filePath, "utf-8")
  const isReadme = isReadmeLocaleFile(path.basename(filePath))
  let fm: TranslationFrontMatter | TranslationReadmeFrontMatter
  try {
    fm = parseTranslationMetadata(content, isReadme)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "missing required key 'translates'"
    ) {
      await processEnglishSourceFile(
        content,
        filePath,
        relPath,
        isReadme,
        repoCwd,
        maintainers,
        manifest
      )
      return
    }
    throw error
  }

  const dirPath = path.dirname(filePath)
  const translatesPath = path.join(dirPath, fm.translates)

  if (!fs.existsSync(translatesPath)) {
    throw new Error(
      `${relPath}: translates field points to non-existent file: ${fm.translates}`
    )
  }

  const translatesRelPath = path.relative(ARTICLES_PATH, translatesPath)
  const sourceContent = fs.readFileSync(translatesPath, "utf-8")
  const sourceIsReadme = isReadmeLocaleFile(path.basename(translatesPath))
  let sourceFm: SourceFrontMatter | SourceReadmeFrontMatter
  try {
    sourceFm = parseSourceMetadata(sourceContent, sourceIsReadme)
  } catch (error) {
    throw new Error(
      `${relPath}: source frontmatter invalid in ${translatesRelPath}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }
  const sourceSlug = sourceFm.slug
  const sourceParentSlug = getParentSlugFromRelPath(translatesRelPath)
  const resolvedSourceSlug = sourceIsReadme
    ? sourceParentSlug
    : resolveSourceSlug(sourceParentSlug, sourceSlug)

  const entry = manifest[resolvedSourceSlug]
  if (!entry) {
    throw new Error(
      `${relPath}: source slug "${resolvedSourceSlug}" not found in manifest`
    )
  }

  const { lastmod } = await getArticleDates(repoCwd, relPath, maintainers)

  if (!entry.availableLocales.includes("en")) {
    entry.availableLocales.push("en")
  }
  entry.localizedFilePaths.en = relPath

  if ("title" in fm && fm.title) entry.titleByLocale.en = fm.title
  const chapterTitle = "chapter-title" in fm ? fm["chapter-title"] : undefined
  const introTitle = "intro-title" in fm ? fm["intro-title"] : undefined

  if (chapterTitle) entry.chapterTitleByLocale.en = chapterTitle
  if (introTitle) {
    entry.introTitleByLocale.en = introTitle
    entry.hasIntro = true
  }
  if ("description" in fm && fm.description) {
    entry.descriptionByLocale.en = fm.description
  }
  if ("banner" in fm && fm.banner) {
    if (!entry.bannerByLocale) entry.bannerByLocale = {}
    entry.bannerByLocale.en = fm.banner
  }

  if (lastmod) entry.lastmodByLocale.en = lastmod

  entry.translatedFromRevisionByLocale.en = fm["translated-from-revision"]

  try {
    const headSha = await getHeadSha(repoCwd)

    if (fm["translated-from-revision"] === headSha) {
      entry.translationFreshnessByLocale.en = "fresh"
    } else {
      const sourceRevisionIsAncestor = await isAncestor(
        repoCwd,
        fm["translated-from-revision"],
        headSha
      )
      if (!sourceRevisionIsAncestor) {
        entry.translationFreshnessByLocale.en = "unknown"
      } else {
        const sourceChanged = await hasPathChangedSince(
          repoCwd,
          fm["translated-from-revision"],
          headSha,
          translatesRelPath
        )
        entry.translationFreshnessByLocale.en = sourceChanged
          ? "stale"
          : "fresh"
      }
    }
  } catch {
    entry.translationFreshnessByLocale.en = "unknown"
  }
}

async function processEnglishSourceFile(
  content: string,
  filePath: string,
  relPath: string,
  isReadme: boolean,
  repoCwd: string,
  maintainers: string[],
  manifest: ArticleManifest
): Promise<void> {
  const fm = parseSourceMetadata(content, isReadme)
  const parentSlug = getParentSlugFromRelPath(relPath)
  const sourcePath = isReadme ? null : getSourcePathForEnglishFile(filePath)
  const sourceSlug = sourcePath ? tryReadSlugFromFile(sourcePath) : null
  const resolvedSlug = isReadme
    ? parentSlug
    : resolveSourceSlug(parentSlug, sourceSlug ?? fm.slug)
  const entry = manifest[resolvedSlug]
  if (!entry) {
    throw new Error(
      `${relPath}: source slug "${resolvedSlug}" not found in manifest`
    )
  }

  const { lastmod } = await getArticleDates(repoCwd, relPath, maintainers)

  if (!entry.availableLocales.includes("en")) {
    entry.availableLocales.push("en")
  }
  entry.localizedFilePaths.en = relPath

  if ("title" in fm && fm.title) entry.titleByLocale.en = fm.title
  const chapterTitle = "chapter-title" in fm ? fm["chapter-title"] : undefined
  const introTitle = "intro-title" in fm ? fm["intro-title"] : undefined

  if (chapterTitle) entry.chapterTitleByLocale.en = chapterTitle
  if (introTitle) {
    entry.introTitleByLocale.en = introTitle
    entry.hasIntro = true
  }
  if ("description" in fm && fm.description) {
    entry.descriptionByLocale.en = fm.description
  }
  if ("banner" in fm && fm.banner) {
    if (!entry.bannerByLocale) entry.bannerByLocale = {}
    entry.bannerByLocale.en = fm.banner
  }
  if (lastmod) entry.lastmodByLocale.en = lastmod
  entry.translationFreshnessByLocale.en = "unknown"
}

function readSlugFromFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8")
  return parseSourceMetadata(
    content,
    isReadmeLocaleFile(path.basename(filePath))
  ).slug
}

function tryReadSlugFromFile(filePath: string): string | null {
  try {
    return readSlugFromFile(filePath) || null
  } catch {
    return null
  }
}

function getSourcePathForEnglishFile(filePath: string): string | null {
  const dirname = path.dirname(filePath)
  const basename = path.basename(filePath, ".en.md")
  const zhPath = path.join(dirname, `${basename}.zh.md`)
  if (fs.existsSync(zhPath)) return zhPath

  const sourcePath = path.join(dirname, `${basename}.md`)
  return fs.existsSync(sourcePath) ? sourcePath : null
}

function hasArticleSources(): boolean {
  if (!fs.existsSync(ARTICLES_PATH)) return false
  const entries = fs.readdirSync(ARTICLES_PATH, { withFileTypes: true })
  return (
    entries.some(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith(".md") || entry.name.endsWith(".zh.md"))
    ) ||
    entries.some(
      (entry) => entry.isDirectory() && !shouldIgnoreDirectory(entry.name)
    )
  )
}

function cloneArticlesRepository(): void {
  if (fs.existsSync(ARTICLES_PATH)) {
    fs.rmSync(ARTICLES_PATH, { recursive: true, force: true })
  }

  process.stderr.write(
    `Warning: articles/ sources missing; cloning ${ARTICLES_REPO_URL}\n`
  )
  const result = spawnSync(
    "git",
    ["clone", "--depth", "1", ARTICLES_REPO_URL, ARTICLES_PATH],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  )

  if (result.status !== 0) {
    process.stderr.write(
      `Error: Failed to clone articles repository from ${ARTICLES_REPO_URL}\n`
    )
    process.exit(result.status ?? 1)
  }
}

function ensureArticleSources(): void {
  if (hasArticleSources()) return
  cloneArticlesRepository()
  if (!hasArticleSources()) {
    process.stderr.write(
      `Error: articles/ source tree is empty at ${ARTICLES_PATH}\n`
    )
    process.exit(1)
  }
}

async function processDirectory(
  dirPath: string,
  relFromArticles: string,
  slugPrefix: string,
  depth: number,
  manifest: ArticleManifest,
  repoCwd: string,
  maintainers: string[],
  aliases: Map<string, string>
): Promise<boolean> {
  let hasError = false

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  const readmeZh = entries.find((e) => e.isFile() && e.name === "README.zh.md")
  const readmeFallback = entries.find(
    (e) => e.isFile() && e.name === "README.md"
  )
  const readmeSource = readmeZh || readmeFallback

  if (readmeSource) {
    const readmePath = path.join(dirPath, readmeSource.name)
    const readmeSlug = tryReadSlugFromFile(readmePath)

    if (readmeSlug) {
      const parentSlug = getParentSlug(slugPrefix)
      try {
        const entry = await processSourceFile(
          readmePath,
          `${relFromArticles}/${readmeSource.name}`,
          slugPrefix,
          true,
          parentSlug,
          repoCwd,
          maintainers,
          aliases
        )
        manifest[slugPrefix] = entry as ArticleEntry
      } catch (error) {
        process.stderr.write(
          `Error: ${error instanceof Error ? error.message : String(error)}\n`
        )
        hasError = true
      }
    }
  }

  const sourceFiles = entries.filter(
    (e) =>
      e.isFile() &&
      (e.name.endsWith(".zh.md") ||
        (e.name.endsWith(".md") && !e.name.endsWith(".en.md"))) &&
      !isReadmeLocaleFile(e.name) &&
      !shouldIgnoreFile(e.name, false)
  )

  const sourceFileJobs: Array<{
    sourcePath: string
    relPath: string
    compositeSlug: string
    parentSlug: string | undefined
  }> = []
  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(dirPath, sourceFile.name)
    const relPath = `${relFromArticles}/${sourceFile.name}`

    const articleSlug = tryReadSlugFromFile(sourcePath)
    if (!articleSlug) {
      process.stderr.write(
        `WARN: Skipping file without slug: articles/${relPath}\n`
      )
      continue
    }

    if (!SLUG_REGEX.test(articleSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${articleSlug}" in: articles/${relPath}\n`
      )
      hasError = true
      continue
    }

    const compositeSlug = resolveSourceSlug(slugPrefix, articleSlug)
    const parentSlug = getParentSlug(compositeSlug)
    sourceFileJobs.push({ sourcePath, relPath, compositeSlug, parentSlug })
  }

  const sourceFileResults = await Promise.all(
    sourceFileJobs.map(
      async ({ sourcePath, relPath, compositeSlug, parentSlug }) => {
        try {
          const entry = await processSourceFile(
            sourcePath,
            relPath,
            compositeSlug,
            false,
            parentSlug,
            repoCwd,
            maintainers,
            aliases
          )
          return { compositeSlug, entry: entry as ArticleEntry, error: false }
        } catch (error) {
          process.stderr.write(
            `Error: ${error instanceof Error ? error.message : String(error)}\n`
          )
          return { compositeSlug, entry: null, error: true }
        }
      }
    )
  )
  for (const result of sourceFileResults) {
    if (result.entry) {
      manifest[result.compositeSlug] = result.entry
    }
    if (result.error) hasError = true
  }

  const readmeEn = entries.find((e) => e.isFile() && e.name === "README.en.md")
  if (readmeEn && manifest[slugPrefix]) {
    const readmePath = path.join(dirPath, readmeEn.name)
    try {
      await processTranslationFile(
        readmePath,
        `${relFromArticles}/${readmeEn.name}`,
        repoCwd,
        maintainers,
        manifest
      )
    } catch (error) {
      process.stderr.write(
        `Error: ${error instanceof Error ? error.message : String(error)}\n`
      )
      hasError = true
    }
  }

  const enFiles = entries.filter(
    (e) =>
      e.isFile() &&
      e.name.endsWith(".en.md") &&
      !isReadmeLocaleFile(e.name) &&
      !shouldIgnoreFile(e.name, false)
  )

  const enFileResults = await Promise.all(
    enFiles.map(async (enFile) => {
      const enPath = path.join(dirPath, enFile.name)
      const relPath = `${relFromArticles}/${enFile.name}`

      try {
        await processTranslationFile(
          enPath,
          relPath,
          repoCwd,
          maintainers,
          manifest
        )
        return false
      } catch (error) {
        process.stderr.write(
          `Error: ${error instanceof Error ? error.message : String(error)}\n`
        )
        return true
      }
    })
  )
  if (enFileResults.some(Boolean)) hasError = true

  const subDirs = entries.filter(
    (e) => e.isDirectory() && !shouldIgnoreDirectory(e.name)
  )

  const subDirJobs: Array<() => Promise<boolean>> = []
  for (const subDirEntry of subDirs) {
    const subDirPath = path.join(dirPath, subDirEntry.name)
    const subRelPath = `${relFromArticles}/${subDirEntry.name}`

    if (depth >= MAX_DEPTH) {
      process.stderr.write(
        `Error: Directory nesting exceeds maximum depth of ${MAX_DEPTH}: articles/${subRelPath}\n`
      )
      hasError = true
      continue
    }

    const subReadmeZhPath = path.join(subDirPath, "README.zh.md")
    const subReadmePath = path.join(subDirPath, "README.md")
    const subReadmeExists = fs.existsSync(subReadmeZhPath)
      ? subReadmeZhPath
      : fs.existsSync(subReadmePath)
        ? subReadmePath
        : null

    if (!subReadmeExists) continue

    const subSlug = tryReadSlugFromFile(subReadmeExists)
    if (!subSlug) {
      if (depth < 1) {
        process.stderr.write(
          `Error: Empty slug not allowed in top-level folder: articles/${subRelPath}/README.zh.md\n`
        )
        hasError = true
        continue
      }
      subDirJobs.push(() =>
        processDirectory(
          subDirPath,
          subRelPath,
          slugPrefix,
          depth + 1,
          manifest,
          repoCwd,
          maintainers,
          aliases
        )
      )
      continue
    }

    if (!SLUG_REGEX.test(subSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${subSlug}" in: articles/${subRelPath}/README.zh.md\n`
      )
      hasError = true
      continue
    }

    const subSlugPrefix = resolveSourceSlug(slugPrefix, subSlug)
    subDirJobs.push(() =>
      processDirectory(
        subDirPath,
        subRelPath,
        subSlugPrefix,
        depth + 1,
        manifest,
        repoCwd,
        maintainers,
        aliases
      )
    )
  }

  const subDirResults = await Promise.all(subDirJobs.map((job) => job()))
  if (subDirResults.some(Boolean)) hasError = true

  return hasError
}

async function main(): Promise<void> {
  let manifest: ArticleManifest = {}
  let hasError = false

  ensureArticleSources()

  const maintainers = await loadMaintainers()
  const aliases = await loadAuthorAliases()

  const topLevelFolders = fs
    .readdirSync(ARTICLES_PATH, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !shouldIgnoreDirectory(e.name))
    .map((e) => e.name)

  const folderJobs: Array<{
    folderPath: string
    folderName: string
    folderSlug: string
  }> = []
  for (const folderName of topLevelFolders) {
    const folderPath = path.join(ARTICLES_PATH, folderName)
    const readmeZhPath = path.join(folderPath, "README.zh.md")
    const readmePath = path.join(folderPath, "README.md")
    const readmeExists = fs.existsSync(readmeZhPath)
      ? readmeZhPath
      : fs.existsSync(readmePath)
        ? readmePath
        : null

    if (!readmeExists) {
      process.stderr.write(
        `Error: Missing README.zh.md or README.md in folder: articles/${folderName}/\n`
      )
      hasError = true
      continue
    }

    let folderSlug: string
    try {
      folderSlug = readSlugFromFile(readmeExists)
    } catch (error) {
      process.stderr.write(
        `Error: articles/${folderName}/README.zh.md: ${error instanceof Error ? error.message : String(error)}\n`
      )
      hasError = true
      continue
    }

    if (!folderSlug) {
      process.stderr.write(
        `Error: Missing slug in folder README: articles/${folderName}/README.zh.md\n`
      )
      hasError = true
      continue
    }

    if (!SLUG_REGEX.test(folderSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${folderSlug}" in: articles/${folderName}/README.zh.md\n`
      )
      hasError = true
      continue
    }

    folderJobs.push({ folderPath, folderName, folderSlug })
  }

  const folderResults = await Promise.all(
    folderJobs.map(({ folderPath, folderName, folderSlug }) =>
      processDirectory(
        folderPath,
        folderName,
        folderSlug,
        1,
        manifest,
        ARTICLES_PATH,
        maintainers,
        aliases
      )
    )
  )
  if (folderResults.some(Boolean)) hasError = true

  const rootFiles = fs
    .readdirSync(ARTICLES_PATH, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        (e.name.endsWith(".zh.md") ||
          (e.name.endsWith(".md") && !e.name.endsWith(".en.md"))) &&
        !isReadmeLocaleFile(e.name) &&
        !shouldIgnoreFile(e.name, true)
    )
    .map((e) => e.name)

  const rootFileJobs: Array<{
    rootFilePath: string
    rootFile: string
    rawSlug: string
  }> = []
  for (const rootFile of rootFiles) {
    const rootFilePath = path.join(ARTICLES_PATH, rootFile)
    const rawSlug = tryReadSlugFromFile(rootFilePath)

    if (!rawSlug) {
      process.stderr.write(
        `WARN: Skipping root file without slug: articles/${rootFile}\n`
      )
      continue
    }

    if (!SLUG_REGEX.test(rawSlug)) {
      process.stderr.write(
        `Error: Invalid slug format "${rawSlug}" in: articles/${rootFile}\n`
      )
      hasError = true
      continue
    }

    rootFileJobs.push({ rootFilePath, rootFile, rawSlug })
  }

  const rootFileResults = await Promise.all(
    rootFileJobs.map(async ({ rootFilePath, rootFile, rawSlug }) => {
      try {
        const entry = await processSourceFile(
          rootFilePath,
          rootFile,
          rawSlug,
          false,
          undefined,
          ARTICLES_PATH,
          maintainers,
          aliases
        )
        return { rawSlug, entry: entry as ArticleEntry, error: false }
      } catch (error) {
        process.stderr.write(
          `Error: ${error instanceof Error ? error.message : String(error)}\n`
        )
        return { rawSlug, entry: null, error: true }
      }
    })
  )
  for (const result of rootFileResults) {
    if (result.entry) {
      manifest[result.rawSlug] = result.entry
    }
    if (result.error) hasError = true
  }

  const rootEnFiles = fs
    .readdirSync(ARTICLES_PATH, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".en.md") &&
        !isReadmeLocaleFile(e.name) &&
        !shouldIgnoreFile(e.name, true)
    )
    .map((e) => e.name)

  const rootEnFileResults = await Promise.all(
    rootEnFiles.map(async (rootEnFile) => {
      const rootEnPath = path.join(ARTICLES_PATH, rootEnFile)
      try {
        await processTranslationFile(
          rootEnPath,
          rootEnFile,
          ARTICLES_PATH,
          maintainers,
          manifest
        )
        return false
      } catch (error) {
        process.stderr.write(
          `Error: ${error instanceof Error ? error.message : String(error)}\n`
        )
        return true
      }
    })
  )
  if (rootEnFileResults.some(Boolean)) hasError = true

  for (const entry of Object.values(manifest)) {
    entry.children = undefined
  }

  for (const [slug, entry] of Object.entries(manifest)) {
    const parent = entry.parentSlug
    if (!parent || !manifest[parent]) continue
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
  process.stdout.write(
    buildGenerationSummary(manifest, {
      articlesPath: ARTICLES_PATH,
      outputFile: OUTPUT_FILE,
      maxDepth: MAX_DEPTH,
    })
  )
  process.stdout.write(
    `Generated ${MANIFEST_FILE_NAME} with ${entryCount} entries\n`
  )
}

main()
