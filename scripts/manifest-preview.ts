import path from "path"
import type { ArticleEntry } from "@/lib/articles/manifest"

const TREE_PREVIEW_DEPTH = 3
const TREE_PREVIEW_CHILD_LIMIT = 12

type ArticleManifest = Record<string, ArticleEntry>

export interface GenerationSummaryOptions {
  articlesPath: string
  outputFile: string
  maxDepth: number
}

export function buildGenerationSummary(
  manifest: ArticleManifest,
  { articlesPath, outputFile, maxDepth }: GenerationSummaryOptions
): string {
  const entries = Object.values(manifest)
  const folders = entries.filter((e) => e.isFolder)
  const articles = entries.filter((e) => !e.isFolder)
  const roots = entries
    .filter((e) => !e.parentSlug || !manifest[e.parentSlug])
    .toSorted(comparePreviewEntries)
  const maxSlugDepth = entries.reduce(
    (max, e) => Math.max(max, e.slug.split("/").length),
    0
  )

  const summaryLines = [
    "[manifest] Article structure indexed",
    `Source: ${path.relative(process.cwd(), articlesPath) || "."}`,
    `Output: ${path.relative(process.cwd(), outputFile) || outputFile}`,
    `Entries: ${entries.length} total (${folders.length} folders, ${articles.length} articles)`,
    `Roots: ${roots.length} | max slug depth: ${maxSlugDepth} | max directory depth: ${maxDepth}`,
    `Flags: ${countFlagged(entries, "isPreface")} preface, ${countFlagged(entries, "isAppendix")} appendix, ${countFlagged(entries, "isAdvanced")} advanced, ${countFlagged(entries, "hasIntro")} with intro`,
    "Legend: [dir] folder README, [doc] article, * advanced, + intro, ! preface/appendix",
    "",
    "Structure preview:",
  ]

  const previewLines = formatPreviewEntries(roots, 0)
  if (previewLines.length === 0) {
    previewLines.push("  (no routable articles found)")
  }

  return [...summaryLines, ...previewLines, ""].join("\n")
}

function countFlagged(
  entries: ArticleEntry[],
  field: "isPreface" | "isAppendix" | "isAdvanced" | "hasIntro"
): number {
  return entries.filter((e) => e[field]).length
}

function formatPreviewEntries(
  entries: ArticleEntry[],
  depth: number
): string[] {
  const visibleEntries = entries.slice(0, TREE_PREVIEW_CHILD_LIMIT)
  const lines: string[] = []
  const nextDepth = depth + 1

  for (const entry of visibleEntries) {
    lines.push(formatPreviewEntry(entry, depth))

    const children = [...(entry.children ?? [])].toSorted(comparePreviewEntries)
    if (children.length > 0) {
      if (nextDepth < TREE_PREVIEW_DEPTH) {
        lines.push(...formatPreviewEntries(children, nextDepth))
      } else {
        lines.push(
          `${indent(nextDepth)}... ${children.length} nested entries hidden`
        )
      }
    }
  }

  const hiddenCount = entries.length - visibleEntries.length
  if (hiddenCount > 0) {
    lines.push(`${indent(depth)}... ${hiddenCount} more entries`)
  }

  return lines
}

function formatPreviewEntry(entry: ArticleEntry, depth: number): string {
  const kind = entry.isFolder ? "dir" : "doc"
  const markers = [
    entry.isAdvanced ? "*" : "",
    entry.hasIntro ? "+" : "",
    entry.isPreface || entry.isAppendix ? "!" : "",
  ]
    .filter(Boolean)
    .join("")
  const markerSuffix = markers === "" ? "" : ` ${markers}`
  const indexSuffix = entry.index >= 0 ? ` #${entry.index}` : ""
  const childCount = entry.children?.length ?? 0
  const childSuffix = childCount > 0 ? `, ${childCount} children` : ""
  const title = truncate(getPreviewTitle(entry), 72)

  return `${indent(depth)}- [${kind}] ${title} <${entry.slug}>${indexSuffix}${markerSuffix}${childSuffix} @ articles/${entry.filePath}`
}

function comparePreviewEntries(a: ArticleEntry, b: ArticleEntry): number {
  if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1

  const indexA = a.index >= 0 ? a.index : Number.MAX_SAFE_INTEGER
  const indexB = b.index >= 0 ? b.index : Number.MAX_SAFE_INTEGER
  if (indexA !== indexB) return indexA - indexB

  return getPreviewTitle(a).localeCompare(getPreviewTitle(b), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function getPreviewTitle(entry: ArticleEntry): string {
  return (
    entry.chapterTitleByLocale.zh ||
    entry.titleByLocale.zh ||
    entry.chapterTitleByLocale.en ||
    entry.introTitleByLocale.zh ||
    entry.introTitleByLocale.en ||
    entry.filePath.split("/").pop()?.replace(/\.md$/i, "") ||
    entry.slug
  )
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}...`
}

function indent(depth: number): string {
  return "  ".repeat(depth)
}
