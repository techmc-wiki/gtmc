import fs from "fs"
import path from "path"

import { resolveSlug, type ResolveResult } from "@/lib/articles/slug-resolver"

export const ARTICLES_PATH = path.join(process.cwd(), "articles")

export async function resolveLocalArticlePath(slugPath: string): Promise<string | null> {
  const manifestPath = await resolveSlug(slugPath)
  if (manifestPath) return manifestPath

  return resolveRawArticlePath(slugPath).filePath
}

function resolveRawArticlePath(slugPath: string): ResolveResult {
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
