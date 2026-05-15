export interface ArticleContentArtifact {
  slug: string
  filePath: string
  content: string
  frontmatter: Record<string, unknown>
}

/**
 * Produces a flat, filesystem-safe filename for a given article slug.
 *
 * Encoding strategy: `encodeURIComponent(slug).replace(/%/g, "~")`
 *
 * This ensures the output never contains `/` (which would create directory
 * boundaries) or `%` (which can be misinterpreted in some filesystem contexts).
 * The tilde (`~`) is chosen as a safe, printable ASCII replacement for `%`.
 *
 * The reverse mapping is unnecessary because the original slug is stored
 * inside the artifact JSON, so decoding can be done via artifact content.
 *
 * @example
 *   artifactFilename("preface")                      // => "preface"
 *   artifactFilename("TreeFarm/foo")                 // => "TreeFarm~2Ffoo"
 *   artifactFilename("Components&Features/活塞")      // => "Components~26Features~2F~E6~B4~BB~E5~A1~9E"
 */
export function artifactFilename(slug: string): string {
  return encodeURIComponent(slug).replace(/%/g, "~")
}
