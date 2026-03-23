import MiniSearch from "minisearch"
import { getSidebarTree } from "@/actions/sidebar"
import {
  getRepoFileContent,
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github-pr"
import { prisma } from "@/lib/prisma"

interface IndexedArticle {
  id: string
  title: string
  slug: string
  content: string
}

interface TreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  children: TreeNode[]
}

export const CJK_TOKENIZER = (text: string): string[] =>
  text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]|[a-zA-Z0-9]+/g) || []

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\n{2,}/g, " ")
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
  const [dbArticles, tree] = await Promise.all([
    prisma.article.findMany({
      where: { isFolder: false },
      select: { id: true, title: true, slug: true, content: true },
    }),
    getSidebarTree(),
  ])

  const articles: IndexedArticle[] = dbArticles.map((article) => ({
    id: article.slug,
    title: article.title,
    slug: article.slug,
    content: stripMarkdown(article.content),
  }))

  const dbSlugs = new Set(dbArticles.map((article) => article.slug))
  const uniqueGithubNodes = new Map<string, { title: string; slug: string }>()

  for (const node of flattenTree(tree)) {
    if (!dbSlugs.has(node.slug) && !uniqueGithubNodes.has(node.slug)) {
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
      const markdown = await getRepoFileContent(`${node.slug}.md`)
      if (!markdown) {
        continue
      }

      articles.push({
        id: node.slug,
        title: node.title,
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
