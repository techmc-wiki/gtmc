import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"

import type { RehypeShikiPlugin } from "@/lib/markdown/syntax/rehype-shiki"
import type { CodeReference } from "@/lib/markdown/code-provenance"
import {
  buildRemarkPlugins,
  buildRehypePlugins,
} from "@/lib/markdown/pipeline/core"
import { rehypeCJKSpacing } from "@/lib/markdown/transforms/rehype-cjk-spacing"

interface PdfPipelineOptions {
  shikiPlugin?: RehypeShikiPlugin
  codeReferences?: readonly CodeReference[]
  articleSlug?: string
  locale?: "en" | "zh"
}

export async function renderMarkdownToHtml(
  content: string,
  options: PdfPipelineOptions
): Promise<string> {
  const remarkPlugins = buildRemarkPlugins({
    includeWikilinks: true,
  })
  const rehypePlugins = buildRehypePlugins({
    shikiPlugin: options.shikiPlugin,
    codeReferences: options.codeReferences,
    cjkSpacingPlugin: rehypeCJKSpacing,
  })

  const file = await unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePlugins)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content)

  let html = String(file)
  html = html.replaceAll(
    /<a\s+href="[^"]*"([^>]*class="[^"]*wikilink[^"]*"[^>]*)>(.*?)<\/a>/gi,
    "<span$1>$2</span>"
  )

  const locale = options.locale ?? "en"
  const notice = locale === "zh" ? "该图为动图。" : "This figure is animated."
  const linkText = locale === "zh" ? "查看原图" : "View original"
  const baseUrl = options.articleSlug
    ? `https://techmc.wiki/${locale}/articles/${options.articleSlug}`
    : ""
  const sourceLink = baseUrl
    ? ` <a href="${baseUrl}" class="gif-source-link">${linkText}</a>`
    : ""
  html = html.replaceAll(
    /(<img[^>]*src="(?!data:)[^"]*\.gif[^>]*\/?\s*>)/gi,
    `$1<p class="gif-caption">▶ ${notice}${sourceLink}</p>`
  )

  return html
}
