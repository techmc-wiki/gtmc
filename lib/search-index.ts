import MiniSearch from "minisearch"
import { remark } from "remark"
import stripMarkdownPlugin from "strip-markdown"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import {
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github/articles-repo"
import { getArticleContentBySlug } from "@/lib/articles/content"

import type { ArticleLocale } from "@/lib/articles/manifest"
import type { ChapterNavNode } from "@/types/chapter-nav"

interface IndexedArticle {
  id: string
  title: string
  slug: string
  content: string
}

export const CJK_TOKENIZER = (text: string): string[] =>
  text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]|[a-zA-Z0-9]+/g) || []

function stripMarkdown(text: string): string {
  return remark()
    .use(stripMarkdownPlugin)
    .processSync(text)
    .toString()
    .replace(/\s+/g, " ")
    .trim()
}

function flattenTree(
  nodes: ChapterNavNode[]
): { title: string; slug: string }[] {
  const result: { title: string; slug: string }[] = []

  for (const node of nodes) {
    if (!node.isFolder) {
      result.push({ title: node.title, slug: node.slug })
    }
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children))
    }
  }

  return result
}

const cachedIndexes = new Map<ArticleLocale, MiniSearch<IndexedArticle>>()
const cacheTimestamps = new Map<ArticleLocale, number>()
const cachedCommitShas = new Map<ArticleLocale, string | null>()
const buildPromises = new Map<
  ArticleLocale,
  Promise<MiniSearch<IndexedArticle>>
>()

const CACHE_TTL = 1800_000
const FETCH_CONCURRENCY = 5

async function getLatestCommitSha(): Promise<string | null> {
  try {
    const octokit = getOctokit()
    const { data: ref } = await octokit.git.getRef({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      ref: "heads/main",
    })
    return ref.object.sha
  } catch (error) {
    console.error("Failed to get latest commit SHA:", error)
    return null
  }
}

function createMiniSearchIndex(
  documents: IndexedArticle[]
): MiniSearch<IndexedArticle> {
  const miniSearch = new MiniSearch<IndexedArticle>({
    fields: ["title", "content"],
    storeFields: ["title", "slug", "content"],
    tokenize: CJK_TOKENIZER,
    searchOptions: {
      boost: { title: 2 },
      fuzzy: 0.2,
      prefix: true,
      tokenize: CJK_TOKENIZER,
    },
  })

  miniSearch.addAll(documents)
  return miniSearch
}

async function buildIndex(
  locale: ArticleLocale
): Promise<MiniSearch<IndexedArticle>> {
  const tree = await getPublicChapterNav(locale)

  const articles: IndexedArticle[] = []

  const uniqueGithubNodes = new Map<string, { title: string; slug: string }>()

  for (const node of flattenTree(tree)) {
    if (!uniqueGithubNodes.has(node.slug)) {
      uniqueGithubNodes.set(node.slug, node)
    }
  }

  const githubNodes = Array.from(uniqueGithubNodes.values())
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < githubNodes.length) {
      const currentIndex = nextIndex
      nextIndex += 1

      const node = githubNodes[currentIndex]
      const artifact = await getArticleContentBySlug(node.slug, locale)
      if (!artifact) {
        continue
      }

      const title =
        (artifact.frontmatter["chapter-title"] as string) ||
        (artifact.frontmatter["title"] as string) ||
        node.title

      const searchContent = stripMarkdown(artifact.content)

      articles.push({
        id: node.slug,
        title,
        slug: node.slug,
        content: searchContent,
      })
    }
  }

  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, githubNodes.length) },
    () => worker()
  )

  await Promise.all(workers)

  return createMiniSearchIndex(articles)
}

export async function getSearchIndex(
  locale: ArticleLocale
): Promise<MiniSearch<IndexedArticle>> {
  const currentSha = await getLatestCommitSha()

  const cachedIndex = cachedIndexes.get(locale)
  const cacheTimestamp = cacheTimestamps.get(locale) ?? 0
  const cachedCommitSha = cachedCommitShas.get(locale)

  if (
    cachedIndex &&
    Date.now() - cacheTimestamp < CACHE_TTL &&
    currentSha &&
    currentSha === cachedCommitSha
  ) {
    return cachedIndex
  }

  const existingPromise = buildPromises.get(locale)
  if (existingPromise) {
    return existingPromise
  }

  const buildPromise = (async () => {
    const index = await buildIndex(locale)
    cachedIndexes.set(locale, index)
    cacheTimestamps.set(locale, Date.now())
    cachedCommitShas.set(locale, currentSha)
    return index
  })().finally(() => {
    buildPromises.delete(locale)
  })

  buildPromises.set(locale, buildPromise)
  return buildPromise
}
