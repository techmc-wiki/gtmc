import MiniSearch from "minisearch"
import { remark } from "remark"
import stripMarkdownPlugin from "strip-markdown"
import { CJK_TOKENIZER } from "@/lib/search/cjk-tokenizer"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import { getArticleContentBySlug } from "@/lib/articles/content"
import { flattenArticleNodes } from "@/lib/articles/navigation-data"

import type { ArticleLocale } from "@/lib/articles/manifest"

interface IndexedArticle {
  id: string
  title: string
  slug: string
  content: string
}

function stripMarkdown(text: string): string {
  return remark()
    .use(stripMarkdownPlugin)
    .processSync(text)
    .toString()
    .replaceAll(/\s+/g, " ")
    .trim()
}

const cachedIndexes = new Map<ArticleLocale, MiniSearch<IndexedArticle>>()
const buildPromises = new Map<
  ArticleLocale,
  Promise<MiniSearch<IndexedArticle>>
>()

const FETCH_CONCURRENCY = 5

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

  for (const node of flattenArticleNodes(tree)) {
    if (!uniqueGithubNodes.has(node.slug)) {
      uniqueGithubNodes.set(node.slug, node)
    }
  }

  const githubNodes = [...uniqueGithubNodes.values()]
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < githubNodes.length) {
      const currentIndex = nextIndex
      nextIndex += 1

      const node = githubNodes[currentIndex]
      const artifact = await getArticleContentBySlug(node.slug, locale) // eslint-disable-line no-await-in-loop -- each worker must settle one fetch before claiming the next article
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
  const cachedIndex = cachedIndexes.get(locale)
  if (cachedIndex) return cachedIndex

  const existingPromise = buildPromises.get(locale)
  if (existingPromise) {
    return existingPromise
  }

  const buildPromise = (async () => {
    const index = await buildIndex(locale)
    cachedIndexes.set(locale, index)
    return index
  })().finally(() => {
    buildPromises.delete(locale)
  })

  buildPromises.set(locale, buildPromise)
  return buildPromise
}
