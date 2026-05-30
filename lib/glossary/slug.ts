import type { GlossaryEntry } from "./manifest"
import data from "@/data/glossary.json" with { type: "json" }

export const glossaryEntries = data as GlossaryEntry[]

const entriesBySlug = new Map<string, GlossaryEntry>()
for (const entry of glossaryEntries) {
  entriesBySlug.set(entry.slug, entry)
}

export function getGlossaryEntry(slug: string): GlossaryEntry | undefined {
  return entriesBySlug.get(slug)
}

export function getAllSlugs(): string[] {
  return glossaryEntries.map((e) => e.slug)
}

export function generateSlug(englishTerm: string): string {
  const slug = englishTerm
    .replace(/\*+$/, "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-{2,}/g, "-")
    .replaceAll(/^-+|-+$/g, "")
  return slug || "term"
}

export function generateUniqueSlug(
  englishTerm: string,
  used: Set<string>
): string {
  const base = generateSlug(englishTerm)
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let counter = 2
  while (used.has(`${base}-${counter}`)) {
    counter++
  }
  const unique = `${base}-${counter}`
  used.add(unique)
  return unique
}
