import { NextRequest, NextResponse } from "next/server"
import { CJK_TOKENIZER, getSearchIndex } from "@/lib/search-index"

interface SearchResult {
  title: string
  slug: string
  snippet: string | null
  matchType: "title" | "content"
  exactMatch: boolean
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
  const loweredQuery = query.toLowerCase()
  const index = loweredContent.indexOf(loweredQuery)

  if (index === -1) {
    const fallback = content.slice(0, 120).trim()
    return fallback.length > 0 && fallback.length < content.length
      ? `${fallback}...`
      : fallback || null
  }

  const start = Math.max(0, index - 50)
  const end = Math.min(content.length, index + query.length + 70)
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

    for (const result of rawResults) {
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

      const titleExact = title.toLowerCase().includes(loweredQuery)
      const contentExact = content.toLowerCase().includes(loweredQuery)
      const matchType: "title" | "content" =
        titleExact || titleMatchedByTerm ? "title" : "content"

      results.push({
        title,
        slug,
        snippet: contentExact
          ? extractSnippet(content, query, matchedTerms)
          : null,
        matchType,
        exactMatch: titleExact || contentExact,
      })
    }

    // Sort by phrase match priority: exact phrase matches first
    results.sort((a, b) => {
      if (a.exactMatch && !b.exactMatch) return -1
      if (!a.exactMatch && b.exactMatch) return 1
      if (a.matchType === "title" && b.matchType === "content") return -1
      if (a.matchType === "content" && b.matchType === "title") return 1
      return 0
    })

    return jsonResponse(results.slice(0, 20))
  } catch (error) {
    console.error("MiniSearch query failed:", error)
    return jsonResponse([])
  }
}
