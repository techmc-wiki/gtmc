"use cache"

import { cacheLife, cacheTag } from "next/cache"
import {
  loadArticleManifest,
  type ArticleEntry,
} from "@/lib/articles/manifest"

export async function getArticleManifest(): Promise<Record<string, ArticleEntry>> {
  cacheLife("hours")
  cacheTag("article-manifest")
  return loadArticleManifest()
}
