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
