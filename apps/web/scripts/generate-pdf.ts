#!/usr/bin/env npx tsx

import { execFileSync, spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"

import enMessages from "@/messages/en.json"
import zhMessages from "@/messages/zh.json"
import {
  linearizeArticles,
  type LinearizedArticle,
} from "@/lib/articles/linearize"
import { getArticleManifest, getArticleTree } from "@/lib/articles/manifest"
import { preparePublicChapterNav } from "@/lib/articles/public-tree"
import {
  assembleBookPlan,
  chapterArticles,
  unescapeHtml,
  type NumberedArticle,
  type PdfLocale,
} from "@/lib/pdf/document"
import { ensurePdfFonts } from "@/lib/pdf/fonts"
import { resolvePdfImages } from "@/lib/pdf/images"
import { renderMermaidSvgs } from "@/lib/pdf/mermaid"
import { writeTokensTypst } from "@/lib/pdf/tokens"
import {
  articleFileName,
  renderArticleSource,
  renderBookSource,
} from "@/lib/pdf/typst-source"
import {
  hasExplicitUrlScheme,
  resolveRelativeArticlePath,
} from "@/lib/markdown/url-utils"
import { workspacePath } from "@/lib/workspace-paths"
import type { ArticleEntry } from "@gtmc/ssg/articles/types"
import {
  artifactFilename,
  type ArticleContentArtifact,
} from "@gtmc/ssg/articles/content"
import {
  collectAssets,
  hastToTypst,
  renderMarkdownToHast,
  texToTypst,
} from "@gtmc/ssg"
import {
  createRehypeShiki,
  persistHighlightCache,
  type RehypeShikiPlugin,
} from "@gtmc/ssg/markdown/syntax/rehype-shiki"
import { createLogger, describeError } from "./lib/logger"

const logger = createLogger("pdf")
const LOCALES: readonly PdfLocale[] = ["en", "zh"]
const SOURCE_URL = "https://techmc.wiki"
const PDF_MESSAGES = {
  en: enMessages.Pdf,
  zh: zhMessages.Pdf,
} satisfies Record<
  PdfLocale,
  { bookTitle: string; bookSubtitle: string; slogan: string }
>

const PDF_ROOT = workspacePath("tools", "pdf")
const WORK_DIR = path.join(PDF_ROOT, "work")
const DIST_DIR = path.join(PDF_ROOT, "dist")
const TOKENS_FILE = path.join(WORK_DIR, "tokens.typ")
const MERMAID_CACHE_DIR = path.join(WORK_DIR, ".cache", "mermaid")
const ARTIFACTS_DIR = workspacePath("apps", "web", "data", "articles")
// Not the site's `.shiki-cache.json`: the site pipeline spaces CJK/Latin runs inside
// cached code highlights, which would no longer match the source the emitter checks.
const HIGHLIGHT_CACHE_FILE = path.join(WORK_DIR, ".cache", "shiki.json")
// Article routes as the site serves them: `/articles/<slug>` and `/<locale>/articles/<slug>`.
const ARTICLE_ROUTE = /^\/(?:(?:en|zh)\/)?articles\/(.+?)\/?$/

type LinkResolver = (href: string) => string | null

interface CliOptions {
  locales: PdfLocale[]
  output: string | null
}

interface SharedContext {
  fontsDir: string
  generatedDate: string
  manifest: Record<string, ArticleEntry>
  revision: string | null
  shikiPlugin: RehypeShikiPlugin
}

interface LocaleContext {
  locale: PdfLocale
  assetsDir: string
  manifest: Record<string, ArticleEntry>
  shikiPlugin: RehypeShikiPlugin
}

interface PreparedArticle {
  article: LinearizedArticle
  /** Source file in the book's locale; relative links and images resolve against it. */
  filePath: string | null
  missingImages: number
  /** `title` is the exact string passed to `#article(title:)`; the emitter drops a body heading equal to it. */
  emit: (title: string, resolveArticleLink: LinkResolver) => string
}

/** The articles in the book, and the source file of each in either locale. */
interface BookIndex {
  slugs: ReadonlySet<string>
  slugByFile: ReadonlyMap<string, string>
}

function parseArgs(argv: readonly string[]): CliOptions {
  const locales: PdfLocale[] = []
  let output: string | null = null

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value: string | undefined = argv[i + 1]
    if (arg === "--") continue
    if (arg === "--locale") {
      if (value !== "en" && value !== "zh") {
        throw new Error(`--locale expects en or zh, got ${value ?? "nothing"}`)
      }
      if (!locales.includes(value)) locales.push(value)
    } else if (arg === "--output" && value !== undefined) {
      output = path.resolve(process.cwd(), value)
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`)
    }
    i++
  }

  if (output !== null && locales.length !== 1) {
    throw new Error("--output needs exactly one --locale")
  }
  return { locales: locales.length > 0 ? locales : [...LOCALES], output }
}

function getArticlesRevision(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: workspacePath("content", "articles"),
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

function readArtifact(slug: string, locale: PdfLocale): ArticleContentArtifact {
  const artifactPath = path.join(
    ARTIFACTS_DIR,
    locale,
    `${artifactFilename(slug)}.json`
  )
  let artifact: ArticleContentArtifact
  try {
    artifact = JSON.parse(
      fs.readFileSync(artifactPath, "utf-8")
    ) as ArticleContentArtifact
  } catch (error) {
    throw new Error(
      `Unreadable article artifact ${artifactPath}: ${describeError(error)}. Run pnpm build:content first.`,
      { cause: error }
    )
  }
  if (typeof artifact.content !== "string") {
    throw new Error(`Article artifact has no content: ${artifactPath}`)
  }
  return artifact
}

function sourceFileOf(
  manifest: Record<string, ArticleEntry>,
  slug: string,
  locale: PdfLocale,
  fallback: string | null
): string | null {
  const entry: ArticleEntry | undefined = manifest[slug]
  return entry?.localizedFilePaths[locale] ?? fallback
}

async function prepareArticle(
  article: LinearizedArticle,
  ctx: LocaleContext
): Promise<PreparedArticle> {
  const artifact = readArtifact(article.slug, ctx.locale)
  const root = await renderMarkdownToHast(artifact.content, {
    articleSlug: article.slug,
    codeReferences: artifact.codeReferences,
    locale: ctx.locale,
    shikiPlugin: ctx.shikiPlugin,
  })
  const assets = collectAssets(root)
  const filePath = sourceFileOf(
    ctx.manifest,
    article.slug,
    ctx.locale,
    article.filePath
  )
  const images = await resolvePdfImages(assets.images, {
    articleFilePath: filePath,
    outDir: ctx.assetsDir,
    locale: ctx.locale,
  })
  const mermaid = await renderMermaidSvgs(assets.mermaid, {
    outDir: ctx.assetsDir,
    cacheDir: MERMAID_CACHE_DIR,
  })
  return {
    article,
    filePath,
    missingImages: [...images.values()].filter((asset) => "missing" in asset)
      .length,
    emit: (title, resolveArticleLink) =>
      hastToTypst(root, {
        articleSlug: article.slug,
        locale: ctx.locale,
        title,
        resolveArticleLink,
        assets: {
          image: (src: string) => images.get(src) ?? null,
          mermaid: (source: string) => mermaid.get(source) ?? null,
        },
        math: texToTypst,
      }),
  }
}

function indexBook(
  slugs: ReadonlySet<string>,
  manifest: Record<string, ArticleEntry>
): BookIndex {
  const slugByFile = new Map<string, string>()
  for (const slug of slugs) {
    const entry: ArticleEntry | undefined = manifest[slug]
    if (entry === undefined) {
      throw new Error(
        `Book article ${slug} is missing from the article manifest`
      )
    }
    for (const file of [
      entry.filePath,
      ...Object.values(entry.localizedFilePaths),
    ]) {
      if (file) slugByFile.set(file.replaceAll("\\", "/"), slug)
    }
  }
  return { slugs, slugByFile }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// A bare `x.md` link means the book's own locale when that file exists, then the other locale.
function sourceFileCandidates(file: string, locale: PdfLocale): string[] {
  if (!/\.md$/i.test(file)) return []
  if (/\.(?:zh|en)\.md$/i.test(file)) return [file]
  const stem = file.slice(0, -".md".length)
  return [file, `${stem}.${locale}.md`, `${stem}.zh.md`, `${stem}.en.md`]
}

function resolveTarget(
  decodedPath: string,
  articleFile: string,
  locale: PdfLocale,
  index: BookIndex
): string | null {
  if (decodedPath.startsWith("/")) {
    const route = ARTICLE_ROUTE.exec(decodedPath)
    if (route === null) return null
    const slug = route[1].replace(/\.md$/i, "")
    return index.slugs.has(slug) ? slug : null
  }

  const file = resolveRelativeArticlePath(articleFile, decodedPath)
  for (const candidate of sourceFileCandidates(file, locale)) {
    const slug = index.slugByFile.get(candidate)
    if (slug !== undefined) return slug
  }
  return null
}

/**
 * Maps a raw body href to an xref id for the book. The href arrives percent-encoded,
 * so the path and the anchor are decoded separately. Anything that does not name an
 * article in the book returns null and prints as plain text.
 */
function createLinkResolver(
  articleFile: string | null,
  locale: PdfLocale,
  index: BookIndex
): LinkResolver {
  return (href) => {
    // In-article anchors and external URLs are not article links.
    if (href.startsWith("#") || hasExplicitUrlScheme(href)) return null
    const hash = href.indexOf("#")
    const target = resolveTarget(
      safeDecode(hash === -1 ? href : href.slice(0, hash)),
      articleFile ?? "",
      locale,
      index
    )
    if (target === null || hash === -1) return target
    const anchor = safeDecode(href.slice(hash + 1))
    return anchor === "" ? target : `${target}#${anchor}`
  }
}

function writeArticle(
  dir: string,
  entry: NumberedArticle,
  body: string,
  preface: boolean
): void {
  fs.writeFileSync(
    path.join(dir, articleFileName(entry.article.slug)),
    renderArticleSource(entry, body, preface),
    "utf-8"
  )
}

function outputTargets(
  locale: PdfLocale,
  output: string | null
): { pdf: string; cover: string } {
  if (output === null) {
    return {
      pdf: path.join(DIST_DIR, `gtmc-${locale}.pdf`),
      cover: path.join(DIST_DIR, `gtmc-${locale}.cover.png`),
    }
  }
  const { dir, name } = path.parse(output)
  return { pdf: output, cover: path.join(dir, `${name}.cover.png`) }
}

function typstArgs(
  fontsDir: string,
  input: string,
  output: string,
  extra: readonly string[] = []
): string[] {
  return [
    "compile",
    "--root",
    PDF_ROOT,
    "--font-path",
    fontsDir,
    "--ignore-system-fonts",
    ...extra,
    input,
    output,
  ]
}

// Diagnostics stream through with the locale prefixed; a non-zero exit rejects.
function runTypst(locale: PdfLocale, args: readonly string[]): Promise<void> {
  const binary = process.env.TYPST_BIN || "typst"
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] })
  readline.createInterface({ input: child.stdout }).on("line", (line) => {
    process.stdout.write(`[${locale}] ${line}\n`)
  })
  readline.createInterface({ input: child.stderr }).on("line", (line) => {
    process.stderr.write(`[${locale}] ${line}\n`)
  })
  child.once("error", (error) => {
    reject(
      new Error(
        `Unable to run ${binary}: ${error.message}. Install Typst (brew install typst) or set TYPST_BIN.`,
        { cause: error }
      )
    )
  })
  child.once("close", (code) => {
    if (code === 0) resolve()
    else {
      reject(
        new Error(`${binary} ${args[0]} for ${locale} exited with code ${code}`)
      )
    }
  })
  return promise
}

async function buildLocale(
  locale: PdfLocale,
  output: string | null,
  shared: SharedContext
): Promise<number> {
  logger.event("pdf.started", { locale })
  const tree = preparePublicChapterNav(await getArticleTree(locale))
  if (tree.length === 0) {
    logger.warn("pdf.skipped", { locale, reason: "empty-article-tree" })
    return 0
  }

  const linearized = await linearizeArticles(tree)
  const localeDir = path.join(WORK_DIR, locale)
  const articlesDir = path.join(localeDir, "articles")
  const assetsDir = path.join(localeDir, "assets")
  fs.rmSync(localeDir, { recursive: true, force: true })
  fs.mkdirSync(articlesDir, { recursive: true })
  fs.mkdirSync(assetsDir, { recursive: true })

  // Sequential: each renderMermaidSvgs call may launch Chromium for uncached diagrams.
  const ctx: LocaleContext = {
    locale,
    assetsDir,
    manifest: shared.manifest,
    shikiPlugin: shared.shikiPlugin,
  }
  const prepared = new Map<string, PreparedArticle>()
  for (const article of linearized) {
    prepared.set(article.slug, await prepareArticle(article, ctx))
  }

  // Emptiness does not depend on link targets, so the book's shape is fixed before any link resolves.
  const hasBody = new Set<string>()
  for (const item of prepared.values()) {
    const body = item.emit(unescapeHtml(item.article.title), () => null)
    if (body.trim() !== "") hasBody.add(item.article.slug)
  }
  const plan = assembleBookPlan(linearized, (slug) => hasBody.has(slug))
  const chapterEntries = plan.chapters.flatMap(chapterArticles)
  const included = [...plan.preface, ...chapterEntries]
  const index = indexBook(
    new Set(included.map((entry) => entry.article.slug)),
    shared.manifest
  )

  let missingImages = 0
  const writeEntry = (entry: NumberedArticle, preface: boolean): void => {
    const item = prepared.get(entry.article.slug)
    if (item === undefined) {
      throw new Error(`No prepared article for ${entry.article.slug}`)
    }
    missingImages += item.missingImages
    const body = item.emit(
      entry.article.title,
      createLinkResolver(item.filePath, locale, index)
    )
    writeArticle(articlesDir, entry, body, preface)
  }
  for (const entry of plan.preface) writeEntry(entry, true)
  for (const entry of chapterEntries) writeEntry(entry, false)
  logger.event("pdf.content.emitted", {
    locale,
    article_count: included.length,
    omitted_count: linearized.length - included.length,
  })

  const messages = PDF_MESSAGES[locale]
  const bookPath = path.join(localeDir, "book.typ")
  fs.writeFileSync(
    bookPath,
    renderBookSource({
      locale,
      title: messages.bookTitle,
      subtitle: messages.bookSubtitle,
      tagline: messages.slogan,
      date: shared.generatedDate,
      revision: shared.revision,
      sourceUrl: SOURCE_URL,
      articleCount: chapterEntries.length,
      preface: plan.preface,
      chapters: plan.chapters,
    }),
    "utf-8"
  )

  const targets = outputTargets(locale, output)
  fs.mkdirSync(path.dirname(targets.pdf), { recursive: true })
  // A failed compile must not leave the previous edition behind.
  fs.rmSync(targets.pdf, { force: true })
  fs.rmSync(targets.cover, { force: true })

  await runTypst(locale, typstArgs(shared.fontsDir, bookPath, targets.pdf))
  await runTypst(
    locale,
    typstArgs(shared.fontsDir, bookPath, targets.cover, [
      "--format",
      "png",
      "--pages",
      "1",
      "--ppi",
      "144",
    ])
  )

  logger.event("pdf.generated", {
    locale,
    output: targets.pdf,
    size_mb: (fs.statSync(targets.pdf).size / 1024 / 1024).toFixed(1),
  })
  return missingImages
}

async function main(): Promise<void> {
  const { locales, output } = parseArgs(process.argv.slice(2))
  const shared: SharedContext = {
    fontsDir: await ensurePdfFonts(),
    generatedDate: new Date().toISOString().split("T")[0],
    manifest: await getArticleManifest(),
    revision: getArticlesRevision(),
    shikiPlugin: await createRehypeShiki(HIGHLIGHT_CACHE_FILE),
  }
  await writeTokensTypst(TOKENS_FILE)

  // Locales build one after another: both read and write the shared image and Mermaid caches.
  let missingImages = 0
  let failures = 0
  for (const locale of locales) {
    try {
      missingImages += await buildLocale(locale, output, shared)
    } catch (error) {
      failures += 1
      logger.error("pdf.failed", { locale }, describeError(error))
    }
  }
  persistHighlightCache(HIGHLIGHT_CACHE_FILE)

  if (missingImages > 0) {
    logger.warn(
      "pdf.images.missing",
      { count: missingImages },
      "Remote images that could not be downloaded print as placeholders; the warnings above name each source."
    )
  } else {
    logger.event("pdf.images.missing", { count: 0 })
  }
  if (failures > 0) process.exitCode = 1
}

void main().catch((error: unknown) => {
  logger.error("pdf.failed", {}, describeError(error))
  process.exitCode = 1
})
