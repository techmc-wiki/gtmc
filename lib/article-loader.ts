import fs from "fs"
import path from "path"
import { ARTICLES_PATH } from "./article-fs-constants"

export {
  getArticleTree,
  getLocalizedArticleEntry,
  getLocalizedArticleMetadata,
  type ArticleLocale,
  type LocalizedArticleMetadata,
} from "./article-manifest"

const SUBMODULE_GIT = path.join(ARTICLES_PATH, ".git")

export function isSubmoduleAvailable(): boolean {
  return fs.existsSync(SUBMODULE_GIT)
}

export async function getArticleContent(
  filePath: string
): Promise<string | null> {
  if (isSubmoduleAvailable()) {
    const localPath = path.join(ARTICLES_PATH, filePath)
    try {
      return fs.readFileSync(localPath, "utf-8")
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[article-loader] File not in submodule: ${filePath}, falling back to API`
        )
      }
    }
  }
  if (process.env.NODE_ENV === "development" && !isSubmoduleAvailable()) {
    console.warn("[article-loader] Submodule not available, using API")
  }
  return null
}

export async function getArticleBuffer(
  filePath: string
): Promise<Buffer | null> {
  if (isSubmoduleAvailable()) {
    const localPath = path.join(ARTICLES_PATH, filePath)
    try {
      return fs.readFileSync(localPath)
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[article-loader] Buffer not in submodule: ${filePath}, falling back to API`
        )
      }
    }
  }
  return null
}
