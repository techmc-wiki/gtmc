import type { GlossaryEntry } from "./manifest"
import { glossaryEntries } from "./slug"

export interface ResolvedRelatedTerm {
  slug: string
  fullFormEn: string
}

const entriesByFullFormLower = new Map<string, GlossaryEntry>()
for (const entry of glossaryEntries) {
  entriesByFullFormLower.set(entry.fullFormEn.toLowerCase(), entry)
}

function resolveTermToken(token: string): GlossaryEntry | undefined {
  const stripped = token.includes(":")
    ? token.slice(token.indexOf(":") + 1)
    : token
  const normalized = stripped.trim()
  if (!normalized) return undefined

  const slugCandidate = normalized.toLowerCase().replaceAll(/\s+/g, "-")
  const bySlug = glossaryEntries.find((e) => e.slug === slugCandidate)
  if (bySlug) return bySlug

  return entriesByFullFormLower.get(normalized.toLowerCase())
}

export function parseRelatedTerms(related: string): ResolvedRelatedTerm[] {
  if (!related.trim()) return []

  const tokens = related.trim().split(/\s+/)
  const seen = new Set<string>()
  const results: ResolvedRelatedTerm[] = []

  for (const token of tokens) {
    const entry = resolveTermToken(token)
    if (entry && !seen.has(entry.slug)) {
      seen.add(entry.slug)
      results.push({ slug: entry.slug, fullFormEn: entry.fullFormEn })
    }
  }

  return results
}

export interface ParsedRelatedToken {
  kind: "synonym" | "see"
  target: string
}

export function parseRelated(relatedField: string): ParsedRelatedToken[] {
  if (!relatedField.trim()) return []

  const results: ParsedRelatedToken[] = []
  for (const raw of relatedField.split("; ")) {
    const token = raw.trim()
    if (!token) continue
    if (token.startsWith("synonym:")) {
      results.push({ kind: "synonym", target: token.slice(8).trim() })
    } else if (token.startsWith("see:")) {
      results.push({ kind: "see", target: token.slice(4).trim() })
    }
  }
  return results
}

export function findDanglingRelated(
  entry: GlossaryEntry,
  manifest: GlossaryEntry[]
): string[] {
  const parsed = parseRelated(entry.related)
  if (parsed.length === 0) return []

  const fullFormSet = new Set(manifest.map((e) => e.fullFormEn))
  return parsed
    .map((r) => r.target)
    .filter((target) => !fullFormSet.has(target))
}
