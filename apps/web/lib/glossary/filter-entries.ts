import { buildGlossarySearchIndex, type GlossarySearchIndex } from "./search"
import type { GlossaryIndexEntry } from "./localized-index"

export interface FilterGlossaryEntriesOptions {
  query: string
  selectedCategories: readonly string[]
}

let searchIndexCache: {
  entries: GlossaryIndexEntry[]
  categoryKey: string
  index: GlossarySearchIndex
} | null = null

/**
 * Keyed by the source entries reference and the category set, not by the
 * category-filtered array, which is rebuilt on every call.
 */
function getCachedSearchIndex(
  entries: GlossaryIndexEntry[],
  categoryKey: string,
  categoryFiltered: GlossaryIndexEntry[]
): GlossarySearchIndex {
  if (
    !searchIndexCache ||
    searchIndexCache.entries !== entries ||
    searchIndexCache.categoryKey !== categoryKey
  ) {
    searchIndexCache = {
      entries,
      categoryKey,
      index: buildGlossarySearchIndex(categoryFiltered),
    }
  }

  return searchIndexCache.index
}

/** Applies category-OR filtering before ranked search; a blank query skips the search stage. */
export function filterGlossaryEntries(
  entries: GlossaryIndexEntry[],
  options: FilterGlossaryEntriesOptions
): GlossaryIndexEntry[] {
  const { query, selectedCategories } = options

  let categoryFiltered = entries
  if (selectedCategories.length > 0) {
    const allow = new Set(selectedCategories)
    categoryFiltered = entries.filter((entry) =>
      entry.categories.some((category) => allow.has(category))
    )
  }

  const trimmedQuery = query.trim()
  if (!trimmedQuery) return categoryFiltered

  const categoryKey = JSON.stringify(
    [...new Set(selectedCategories)].toSorted()
  )
  const index = getCachedSearchIndex(entries, categoryKey, categoryFiltered)
  const hits = index.search(trimmedQuery)
  const hitOrder = new Map<string, number>()
  hits.forEach((hit, i) => {
    hitOrder.set(hit.id as string, i)
  })

  return categoryFiltered
    .filter((entry) => hitOrder.has(entry.slug))
    .toSorted(
      (a, b) => (hitOrder.get(a.slug) ?? 0) - (hitOrder.get(b.slug) ?? 0)
    )
}
