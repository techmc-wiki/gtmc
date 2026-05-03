import MiniSearch from "minisearch"
import { remark } from "remark"
import stripMarkdownPlugin from "strip-markdown"
import { getPublicSidebarTree } from "@/lib/articles/public-tree"
import {
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github/articles-repo"
import { getArticleContent } from "@/lib/article-loader"
import { resolveSlug } from "@/lib/slug-resolver"
import { parseFrontMatter } from "@/lib/frontmatter-parser"
import type { TreeNode } from "@/types/sidebar-tree"

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

function flattenTree(nodes: TreeNode[]): { title: string; slug: string }[] {
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

let cachedIndex: MiniSearch<IndexedArticle> | null = null
let cacheTimestamp = 0
let cachedCommitSha: string | null = null
let buildPromise: Promise<MiniSearch<IndexedArticle>> | null = null

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

async function buildIndex(): Promise<MiniSearch<IndexedArticle>> {
  const tree = await getPublicSidebarTree()

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
      const filePath = resolveSlug(node.slug)
      if (!filePath) {
        continue
      }
      const markdown = await getArticleContent(filePath)
      if (!markdown) {
        continue
      }

      const frontMatter = parseFrontMatter(markdown)
      const title = frontMatter.chapterTitle || node.title

      articles.push({
        id: node.slug,
        title: title,
        slug: node.slug,
        content: stripMarkdown(markdown),
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

export async function getSearchIndex(): Promise<MiniSearch<IndexedArticle>> {
  const currentSha = await getLatestCommitSha()

  if (
    cachedIndex &&
    Date.now() - cacheTimestamp < CACHE_TTL &&
    currentSha &&
    currentSha === cachedCommitSha
  ) {
    return cachedIndex
  }

  if (!buildPromise) {
    buildPromise = (async () => {
      const index = await buildIndex()
      cachedIndex = index
      cacheTimestamp = Date.now()
      cachedCommitSha = currentSha
      return index
    })().finally(() => {
      buildPromise = null
    })
  }

  return buildPromise
}
