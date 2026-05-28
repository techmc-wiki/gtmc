import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import matter from "gray-matter"
import { dump as yamlDump } from "js-yaml"
import { shouldIgnoreDirectory, shouldIgnoreFile } from "@/lib/articles/ignore"

type ArticleLocale = "zh" | "en"

type Logger = Pick<typeof console, "info" | "warn" | "error">

export interface MigrationOptions {
  repoPath?: string
  apply?: boolean
  logger?: Logger
}

export interface MigrationResult {
  repoPath: string
  dryRun: boolean
  renamed: number
  rewritten: number
  skipped: number
  warnings: string[]
  errors: string[]
  plannedActions: string[]
}

interface MarkdownFile {
  absolutePath: string
  relativePath: string
  directory: string
  filename: string
  locale: ArticleLocale
  isBareZh: boolean
  normalizedPath: string
  normalizedRelativePath: string
  frontmatter: Record<string, unknown>
  body: string
  hasSlug: boolean
  slug?: string
  alreadyNewSchema: boolean
}

interface ZhSource {
  sourcePath: string
  normalizedPath: string
  normalizedRelativePath: string
  directory: string
  filename: string
  slug: string
}

type Operation =
  | { type: "rename"; from: string; to: string }
  | {
      type: "rewrite"
      filePath: string
      frontmatter: Record<string, unknown>
      body: string
    }

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_ARTICLES_REPO = path.resolve(SCRIPT_DIR, "..", "articles")

const ROOT_EXCLUDED_FILES = new Set([
  "contributing.md",
  "contributing_cn.md",
  "readme.md",
  "readme_cn.md",
  "roadmap.md",
  "reviewers.md",
])

const ZH_FRONTMATTER_ORDER = [
  "slug",
  "index",
  "is-advanced",
  "banner",
  "title",
  "chapter-title",
  "intro-title",
  "description",
] as const

const EN_FRONTMATTER_ORDER = [
  "translates",
  "translated-from-revision",
  "banner",
  "title",
  "chapter-title",
  "intro-title",
  "description",
] as const

const ZH_ALLOWED_KEYS = new Set<string>(ZH_FRONTMATTER_ORDER)
const EN_ALLOWED_KEYS = new Set<string>(EN_FRONTMATTER_ORDER)

const ZH_FORBIDDEN_KEYS = new Set([
  "title-en",
  "chapter-title-en",
  "intro-title-en",
  "date",
  "lastmod",
  "author",
  "co-authors",
  "translates",
  "translated-from-revision",
])

const EN_FORBIDDEN_KEYS = new Set([
  "slug",
  "index",
  "is-advanced",
  "author",
  "co-authors",
  "date",
  "lastmod",
  "title-en",
  "chapter-title-en",
  "intro-title-en",
])

function detectLocale(filename: string): ArticleLocale {
  return filename.endsWith(".en.md") ? "en" : "zh"
}

function normalizeZhFilename(filename: string): string {
  if (filename.endsWith(".zh.md")) return filename
  return filename.replace(/\.md$/i, ".zh.md")
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/")
}

function hasOwn(data: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, key)
}

function hasString(data: Record<string, unknown>, key: string): boolean {
  return typeof data[key] === "string"
}

function isInside(root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate)
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  )
}

function assertInsideRepo(repoRoot: string, candidate: string): void {
  if (!isInside(repoRoot, candidate)) {
    throw new Error(
      `Refusing to access path outside articles repo: ${candidate}`
    )
  }
}

function shouldSkipDirectory(name: string): boolean {
  return name === "_Drafts" || shouldIgnoreDirectory(name)
}

function shouldSkipRootFile(name: string): boolean {
  const lowerName = name.toLowerCase()
  if (ROOT_EXCLUDED_FILES.has(lowerName)) return true
  if (lowerName.startsWith("license")) return true
  return shouldIgnoreFile(name, true)
}

function shouldSkipMarkdownFile(name: string, isRoot: boolean): boolean {
  if (!name.endsWith(".md")) return true
  if (isRoot && shouldSkipRootFile(name)) return true
  return shouldIgnoreFile(name, false)
}

function isNewZhSchema(data: Record<string, unknown>): boolean {
  if (!hasString(data, "slug")) return false
  return Object.keys(data).every(
    (key) => ZH_ALLOWED_KEYS.has(key) && !ZH_FORBIDDEN_KEYS.has(key)
  )
}

function isNewEnSchema(data: Record<string, unknown>): boolean {
  if (!hasString(data, "translates")) return false
  if (!hasString(data, "translated-from-revision")) return false
  return Object.keys(data).every(
    (key) => EN_ALLOWED_KEYS.has(key) && !EN_FORBIDDEN_KEYS.has(key)
  )
}

function isAlreadyNewSchema(
  filename: string,
  locale: ArticleLocale,
  data: Record<string, unknown>
): boolean {
  if (locale === "zh") {
    return filename.endsWith(".zh.md") && isNewZhSchema(data)
  }
  return filename.endsWith(".en.md") && isNewEnSchema(data)
}

function readMarkdownFile(
  repoRoot: string,
  absolutePath: string
): MarkdownFile {
  assertInsideRepo(repoRoot, absolutePath)
  const rawContent = fs.readFileSync(absolutePath, "utf8")
  const parsed = matter(rawContent)
  const filename = path.basename(absolutePath)
  const relativePath = toPosixPath(path.relative(repoRoot, absolutePath))
  const directory = path.dirname(absolutePath)
  const locale = detectLocale(filename)
  const isBareZh = locale === "zh" && !filename.endsWith(".zh.md")
  const normalizedPath = isBareZh
    ? path.join(directory, normalizeZhFilename(filename))
    : absolutePath

  return {
    absolutePath,
    relativePath,
    directory,
    filename,
    locale,
    isBareZh,
    normalizedPath,
    normalizedRelativePath: toPosixPath(
      path.relative(repoRoot, normalizedPath)
    ),
    frontmatter: parsed.data,
    body: parsed.content,
    hasSlug: hasString(parsed.data, "slug"),
    slug: hasString(parsed.data, "slug") ? parsed.data.slug : undefined,
    alreadyNewSchema: isAlreadyNewSchema(filename, locale, parsed.data),
  }
}

function walkMarkdownFiles(
  repoRoot: string,
  directory = repoRoot
): MarkdownFile[] {
  assertInsideRepo(repoRoot, directory)
  const entries = fs
    .readdirSync(directory, { withFileTypes: true })
    .toSorted((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    )
  const isRoot = directory === repoRoot
  const files: MarkdownFile[] = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entry.name)) {
        files.push(...walkMarkdownFiles(repoRoot, absolutePath))
      }
      continue
    }

    if (entry.isFile() && !shouldSkipMarkdownFile(entry.name, isRoot)) {
      files.push(readMarkdownFile(repoRoot, absolutePath))
    }
  }

  return files
}

function orderedPick(
  data: Record<string, unknown>,
  order: readonly string[]
): Record<string, unknown> {
  const nextData: Record<string, unknown> = {}
  for (const key of order) {
    if (hasOwn(data, key)) {
      nextData[key] = data[key]
    }
  }
  return nextData
}

function rewriteZhFrontmatter(
  data: Record<string, unknown>
): Record<string, unknown> {
  return orderedPick(data, ZH_FRONTMATTER_ORDER)
}

function copyLocalizedField(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  legacyKey: string,
  newKey: string
): void {
  if (
    hasOwn(source, legacyKey) &&
    source[legacyKey] !== null &&
    source[legacyKey] !== undefined
  ) {
    target[newKey] = source[legacyKey]
    return
  }

  if (hasOwn(source, newKey)) {
    target[newKey] = source[newKey]
  }
}

function getRelativeTranslationPath(fromFile: string, toFile: string): string {
  const relativePath = toPosixPath(
    path.relative(path.dirname(fromFile), toFile)
  )
  if (relativePath.startsWith(".")) return relativePath
  return `./${relativePath}`
}

function rewriteEnFrontmatter(
  data: Record<string, unknown>,
  translates: string,
  translatedFromRevision: string
): Record<string, unknown> {
  const nextData: Record<string, unknown> = {
    translates,
    "translated-from-revision": translatedFromRevision,
  }

  if (hasOwn(data, "banner")) {
    nextData.banner = data.banner
  }

  copyLocalizedField(data, nextData, "title-en", "title")
  copyLocalizedField(data, nextData, "chapter-title-en", "chapter-title")
  copyLocalizedField(data, nextData, "intro-title-en", "intro-title")

  if (hasOwn(data, "description")) {
    nextData.description = data.description
  }

  return orderedPick(nextData, EN_FRONTMATTER_ORDER)
}

function dumpMarkdown(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  const frontmatterYaml = yamlDump(frontmatter, {
    sortKeys: false,
    lineWidth: -1,
    noRefs: true,
  })
  return `---\n${frontmatterYaml}---\n${body}`
}

function getLastRevision(repoRoot: string, filePath: string): string {
  const revision = execFileSync(
    "git",
    ["-C", repoRoot, "log", "-1", "--format=%H", "--", filePath],
    { encoding: "utf8" }
  ).trim()

  if (revision === "") {
    throw new Error(
      `No git history found for ${toPosixPath(path.relative(repoRoot, filePath))}`
    )
  }

  return revision
}

function gitMove(repoRoot: string, from: string, to: string): void {
  execFileSync("git", ["-C", repoRoot, "mv", "--", from, to], {
    encoding: "utf8",
    stdio: "pipe",
  })
}

function addWarning(result: MigrationResult, message: string): void {
  result.warnings.push(message)
}

function addError(result: MigrationResult, message: string): void {
  result.errors.push(message)
}

function addSkip(result: MigrationResult, message: string): void {
  result.skipped += 1
  result.plannedActions.push(`INFO ${message}`)
}

function addOperation(
  result: MigrationResult,
  operations: Operation[],
  operation: Operation
): void {
  operations.push(operation)
  if (operation.type === "rename") {
    result.renamed += 1
    result.plannedActions.push(
      `RENAME ${toPosixPath(path.relative(result.repoPath, operation.from))} -> ${toPosixPath(path.relative(result.repoPath, operation.to))}`
    )
  } else {
    result.rewritten += 1
    result.plannedActions.push(
      `REWRITE ${toPosixPath(path.relative(result.repoPath, operation.filePath))}`
    )
  }
}

function collectZhSources(
  files: MarkdownFile[],
  result: MigrationResult
): Map<string, ZhSource> {
  const sources = new Map<string, ZhSource>()

  for (const file of files) {
    if (file.locale !== "zh" || !file.hasSlug || file.alreadyNewSchema) {
      continue
    }

    const key = `${file.directory}\0${file.slug}`
    const existingSource = sources.get(key)
    if (existingSource !== undefined) {
      addError(
        result,
        `Duplicate zh source for slug "${file.slug}" in ${toPosixPath(path.relative(result.repoPath, file.directory))}: ${existingSource.filename} and ${file.filename}`
      )
      continue
    }

    sources.set(key, {
      sourcePath: file.absolutePath,
      normalizedPath: file.normalizedPath,
      normalizedRelativePath: file.normalizedRelativePath,
      directory: file.directory,
      filename: file.filename,
      slug: file.slug!,
    })
  }

  return sources
}

function planMigration(
  files: MarkdownFile[],
  result: MigrationResult
): Operation[] {
  const operations: Operation[] = []
  const zhSourcesByDirectoryAndSlug = collectZhSources(files, result)

  for (const file of files) {
    if (file.alreadyNewSchema) {
      addSkip(
        result,
        `${file.relativePath} already uses the new ${file.locale} schema`
      )
      continue
    }

    if (file.locale === "zh") {
      if (file.isBareZh) {
        if (fs.existsSync(file.normalizedPath)) {
          addError(
            result,
            `Cannot rename ${file.relativePath}: target ${file.normalizedRelativePath} already exists`
          )
          continue
        }
        addOperation(result, operations, {
          type: "rename",
          from: file.absolutePath,
          to: file.normalizedPath,
        })
      }

      if (!file.hasSlug) {
        addWarning(
          result,
          `WARN ${file.relativePath}: missing slug; renamed only, frontmatter left unchanged`
        )
        continue
      }

      addOperation(result, operations, {
        type: "rewrite",
        filePath: file.normalizedPath,
        frontmatter: rewriteZhFrontmatter(file.frontmatter),
        body: file.body,
      })
      continue
    }

    if (!file.hasSlug) {
      addError(
        result,
        `Orphan en translation without legacy slug: ${file.relativePath}`
      )
      continue
    }

    const zhSource = zhSourcesByDirectoryAndSlug.get(
      `${file.directory}\0${file.slug}`
    )
    if (zhSource === undefined) {
      addError(
        result,
        `Orphan en translation: ${file.relativePath} has no zh sibling with slug "${file.slug}"`
      )
      continue
    }

    let translatedFromRevision: string
    try {
      translatedFromRevision = getLastRevision(
        result.repoPath,
        zhSource.sourcePath
      )
    } catch (error) {
      addError(result, error instanceof Error ? error.message : String(error))
      continue
    }

    addOperation(result, operations, {
      type: "rewrite",
      filePath: file.absolutePath,
      frontmatter: rewriteEnFrontmatter(
        file.frontmatter,
        getRelativeTranslationPath(file.absolutePath, zhSource.normalizedPath),
        translatedFromRevision
      ),
      body: file.body,
    })
  }

  return operations
}

function applyOperations(repoRoot: string, operations: Operation[]): void {
  const renameOperations = operations.filter(
    (operation): operation is Extract<Operation, { type: "rename" }> =>
      operation.type === "rename"
  )
  const rewriteOperations = operations.filter(
    (operation): operation is Extract<Operation, { type: "rewrite" }> =>
      operation.type === "rewrite"
  )

  for (const operation of renameOperations) {
    assertInsideRepo(repoRoot, operation.from)
    assertInsideRepo(repoRoot, operation.to)
    gitMove(repoRoot, operation.from, operation.to)
  }

  for (const operation of rewriteOperations) {
    assertInsideRepo(repoRoot, operation.filePath)
    fs.writeFileSync(
      operation.filePath,
      dumpMarkdown(operation.frontmatter, operation.body),
      "utf8"
    )
  }
}

export function formatMigrationReport(result: MigrationResult): string {
  const lines = [
    result.dryRun
      ? "[migrate-frontmatter] dry run"
      : "[migrate-frontmatter] applied",
    `Repo: ${result.repoPath}`,
    `Counts: ${result.renamed} renamed, ${result.rewritten} rewritten, ${result.skipped} skipped, ${result.warnings.length} warnings`,
  ]

  if (result.plannedActions.length > 0) {
    lines.push(
      "",
      "Actions:",
      ...result.plannedActions.map((action) => `- ${action}`)
    )
  }

  if (result.warnings.length > 0) {
    lines.push(
      "",
      "Warnings:",
      ...result.warnings.map((warning) => `- ${warning}`)
    )
  }

  if (result.errors.length > 0) {
    lines.push("", "Errors:", ...result.errors.map((error) => `- ${error}`))
  }

  return `${lines.join("\n")}\n`
}

export function runMigration(options: MigrationOptions = {}): MigrationResult {
  const repoPath = path.resolve(options.repoPath ?? DEFAULT_ARTICLES_REPO)
  const result: MigrationResult = {
    repoPath,
    dryRun: options.apply !== true,
    renamed: 0,
    rewritten: 0,
    skipped: 0,
    warnings: [],
    errors: [],
    plannedActions: [],
  }

  if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
    addError(result, `Articles repo not found: ${repoPath}`)
    return result
  }

  const files = walkMarkdownFiles(repoPath)
  const operations = planMigration(files, result)

  if (result.errors.length === 0 && options.apply === true) {
    try {
      applyOperations(repoPath, operations)
    } catch (error) {
      addError(result, error instanceof Error ? error.message : String(error))
    }
  }

  const logger = options.logger
  if (logger !== undefined) {
    for (const warning of result.warnings) logger.warn(warning)
    for (const error of result.errors) logger.error(error)
  }

  return result
}

interface CliArgs {
  apply: boolean
  repoPath?: string
}

function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = { apply: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dry-run") {
      args.apply = false
      continue
    }
    if (arg === "--apply") {
      args.apply = true
      continue
    }
    if (arg === "--repo") {
      const repoPath = argv[index + 1]
      if (repoPath === undefined || repoPath.startsWith("--")) {
        throw new Error("Missing value for --repo")
      }
      args.repoPath = repoPath
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function main(): void {
  let cliArgs: CliArgs
  try {
    cliArgs = parseCliArgs(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exit(1)
  }

  const result = runMigration({
    apply: cliArgs.apply,
    repoPath: cliArgs.repoPath,
  })
  const report = formatMigrationReport(result)
  if (result.errors.length > 0) {
    process.stderr.write(report)
    process.exit(1)
  }

  process.stdout.write(report)
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
}
