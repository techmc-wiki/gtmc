import type { CodeReference } from "../markdown/code-provenance"
import type { TranslationStatusDetail } from "./types"

export interface ArticleContentArtifact {
  content: string
  frontmatter: Record<string, unknown>
  codeReferences: CodeReference[]
  translationStatus?: TranslationStatusDetail
}

/**
 * Maps a slug to the stable, flat filename used by generated article artifacts.
 * Percent escapes are represented with `~` so `/` cannot create directories and
 * persisted artifact paths remain compatible.
 */
export function artifactFilename(slug: string): string {
  return encodeURIComponent(slug).replaceAll("%", "~")
}
