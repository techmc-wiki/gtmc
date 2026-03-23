import { NextRequest, NextResponse } from "next/server"
import { CJK_TOKENIZER, getSearchIndex } from "@/lib/search-index"

interface SearchResult {
  title: string
  slug: string
  snippet: string | null
  matchType: "title" | "content"
}

type SearchMatchMap = Record<string, string[]>

function isSearchMatchMap(value: unknown): value is SearchMatchMap {
  if (!value || typeof value !== "object") {
    return false
  }

  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (
      !Array.isArray(entry) ||
      !entry.every((item) => typeof item === "string")
    ) {
      return false
    }
  }

  return true
}

function extractSnippet(
  content: string,
  query: string,
  terms: string[]
): string | null {
  if (!content) {
    return null
  }

  const loweredContent = content.toLowerCase()
  const candidates = [query, ...terms]
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .sort((a, b) => b.length - a.length)

  let bestIndex = -1
  let bestLength = query.length

  for (const candidate of candidates) {
    const index = loweredContent.indexOf(candidate.toLowerCase())
    if (index === -1) {
      continue
    }
    if (bestIndex === -1 || index < bestIndex) {
      bestIndex = index
      bestLength = candidate.length
    }
  }

  if (bestIndex === -1) {
    const fallback = content.slice(0, 120).trim()
    return fallback.length > 0 && fallback.length < content.length
      ? `${fallback}...`
      : fallback || null
  }

  const start = Math.max(0, bestIndex - 50)
  const end = Math.min(content.length, bestIndex + bestLength + 70)
  let snippet = content.slice(start, end).trim()

  if (start > 0) {
    snippet = `...${snippet}`
  }
  if (end < content.length) {
    snippet = `${snippet}...`
  }

  return snippet
}

function jsonResponse(results: SearchResult[]) {
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "private, no-store" } }
  )
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim()
  if (!query || query.length < 2) {
    return jsonResponse([])
  }

  try {
    const index = await getSearchIndex()
    const rawResults = index.search(query, {
      tokenize: CJK_TOKENIZER,
      boost: { title: 2 },
      fuzzy: 0.2,
      prefix: true,
    })

    const loweredQuery = query.toLowerCase()
    const results: SearchResult[] = []

    for (const result of rawResults.slice(0, 20)) {
      const title = typeof result.title === "string" ? result.title : ""
      const slug = typeof result.slug === "string" ? result.slug : ""
      const content = typeof result.content === "string" ? result.content : ""
      if (!title || !slug) {
        continue
      }

      const matchMap = isSearchMatchMap(result.match) ? result.match : {}
      const matchedTerms = Object.keys(matchMap)
      const titleMatchedByTerm = matchedTerms.some((term) =>
        matchMap[term]?.includes("title")
      )

      const matchType: "title" | "content" =
        title.toLowerCase().includes(loweredQuery) || titleMatchedByTerm
          ? "title"
          : "content"

      results.push({
        title,
        slug,
        snippet:
          matchType === "content"
            ? extractSnippet(content, query, matchedTerms)
            : null,
        matchType,
      })
    }

    return jsonResponse(results)
  } catch (error) {
    console.error("MiniSearch query failed:", error)
    return jsonResponse([])
  }
}
