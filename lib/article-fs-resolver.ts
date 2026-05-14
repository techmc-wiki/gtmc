import fs from "fs"
import path from "path"

import { ARTICLES_PATH } from "./article-fs-constants"
import { resolveSlug, type ResolveResult } from "./slug-resolver"

export function resolveLocalArticlePath(slugPath: string): string | null {
  const manifestPath = resolveSlug(slugPath)
  if (manifestPath) return manifestPath

  return resolveRawArticlePath(slugPath).filePath
}

export function resolveRawArticlePath(slugPath: string): ResolveResult {
  const normalizedPath = decodeURIComponent(slugPath)

  if (fs.existsSync(path.join(ARTICLES_PATH, normalizedPath))) {
    return { filePath: normalizedPath }
  }

  const withExt = `${normalizedPath}.md`
  if (fs.existsSync(path.join(ARTICLES_PATH, withExt))) {
    return { filePath: withExt }
  }

  return { filePath: null }
}
