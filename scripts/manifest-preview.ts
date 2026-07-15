import path from "path"
import type { ArticleEntry } from "@/lib/articles/manifest"

const TREE_PREVIEW_DEPTH = 2
const TREE_PREVIEW_CHILD_LIMIT = 8

type ArticleManifest = Record<string, ArticleEntry>

export interface ManifestPreviewOptions {
  articlesPath: string
  outputFile: string
  maxDepth: number
}

/** Build the optional, human-readable manifest detail shown with GTMC_LOG_DETAIL=1. */
export function buildManifestPreview(
  manifest: ArticleManifest,
  { articlesPath, outputFile, maxDepth }: ManifestPreviewOptions
): string {
  const entries = Object.values(manifest)
  const folders = entries.filter((entry) => entry.isFolder)
  const articles = entries.filter((entry) => !entry.isFolder)
  const roots = entries
    .filter((entry) => !entry.parentSlug || !manifest[entry.parentSlug])
    .toSorted(comparePreviewEntries)
  const maxSlugDepth = entries.reduce(
    (max, entry) => Math.max(max, entry.slug.split("/").length),
    0
  )

  const summaryLines = [
    "Manifest summary",
    `  ${entries.length} entries  ·  ${folders.length} folders  ·  ${articles.length} articles`,
    `  ${roots.length} top-level routes  ·  ${maxSlugDepth}/${maxDepth} slug/directory depth`,
    `  ${formatFlags(entries)}`,
    "",
    `Source  ${path.relative(process.cwd(), articlesPath) || "."}`,
    `Output  ${path.relative(process.cwd(), outputFile) || outputFile}`,
  ]

  const previewLines = formatPreviewEntries(roots)
  if (previewLines.length === 0) {
    previewLines.push("  (no routable articles found)")
  }

  return [...summaryLines, "", "Contents", ...previewLines].join("\n")
}

function formatFlags(entries: ArticleEntry[]): string {
  const flags: Record<string, number> = {
    preface: countFlagged(entries, "isPreface"),
    appendix: countFlagged(entries, "isAppendix"),
    advanced: countFlagged(entries, "isAdvanced"),
    intro: countFlagged(entries, "hasIntro"),
  }

  return Object.entries(flags)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`)
    .join("  ·  ")
}

function countFlagged(
  entries: ArticleEntry[],
  field: "isPreface" | "isAppendix" | "isAdvanced" | "hasIntro"
): number {
  return entries.filter((entry) => entry[field]).length
}

function formatPreviewEntries(
  entries: ArticleEntry[],
  prefix = "",
  depth = 0
): string[] {
  const visibleEntries = entries.slice(0, TREE_PREVIEW_CHILD_LIMIT)
  const lines: string[] = []

  for (const [index, entry] of visibleEntries.entries()) {
    const isLast =
      index === visibleEntries.length - 1 &&
      entries.length === visibleEntries.length
    const branch = isLast ? "└─" : "├─"
    lines.push(`${prefix}${branch} ${formatPreviewEntry(entry)}`)

    const children = [...(entry.children ?? [])].toSorted(comparePreviewEntries)
    if (children.length === 0) continue

    const childPrefix = `${prefix}${isLast ? "   " : "│  "}`
    if (depth + 1 < TREE_PREVIEW_DEPTH) {
      lines.push(...formatPreviewEntries(children, childPrefix, depth + 1))
    } else {
      lines.push(`${childPrefix}└─ … ${children.length} nested entries`)
    }
  }

  const hiddenCount = entries.length - visibleEntries.length
  if (hiddenCount > 0) {
    lines.push(`${prefix}└─ … ${hiddenCount} more entries`)
  }

  return lines
}

function formatPreviewEntry(entry: ArticleEntry): string {
  const kind = entry.isFolder ? "📁" : "📄"
  const index = entry.index >= 0 ? `#${entry.index}` : ""
  const children = entry.children?.length ?? 0
  const details = [
    index,
    children > 0 ? `📚 ${children}` : "",
    ...getMarkers(entry),
  ].filter(Boolean)
  const suffix = details.length > 0 ? `  ${details.join(" · ")}` : ""

  return `${kind} ${truncate(getPreviewTitle(entry), 54)}  ${entry.slug}${suffix}`
}

function getMarkers(entry: ArticleEntry): string[] {
  return [
    entry.isAdvanced ? "⭐" : "",
    entry.hasIntro ? "📖" : "",
    entry.isPreface ? "👋" : "",
    entry.isAppendix ? "📎" : "",
  ].filter(Boolean)
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
  return `${value.slice(0, maxLength - 1)}…`
}
