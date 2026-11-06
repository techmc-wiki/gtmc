import type { Root } from "hast"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

import type { CodeReference } from "./code-provenance"
import { buildRehypePlugins, buildRemarkPlugins } from "./pipeline/core"
import type { RehypeShikiPlugin } from "./syntax/rehype-shiki"

export interface PdfHastOptions {
  articleSlug: string
  codeReferences?: readonly CodeReference[]
  locale: "en" | "zh"
  shikiPlugin: RehypeShikiPlugin
}

/**
 * Markdown to the hast tree the Typst emitter consumes. Same plugins as the site
 * minus KaTeX (math stays as `code.language-math` nodes for the Typst math
 * converter) and CJK spacing (Typst spaces Latin and CJK text itself).
 */
export async function renderMarkdownToHast(
  content: string,
  options: PdfHastOptions
): Promise<Root> {
  const processor = unified()
    .use(remarkParse)
    .use(buildRemarkPlugins({ includeWikilinks: true }))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(
      buildRehypePlugins({
        shikiPlugin: options.shikiPlugin,
        codeReferences: options.codeReferences,
        katex: false,
      })
    )

  try {
    // The source string is the VFile value: directive and people-mention plugins read it.
    return await processor.run(processor.parse(content), content)
  } catch (error) {
    throw new Error(
      `${options.locale}/${options.articleSlug}: markdown pipeline failed`,
      {
        cause: error,
      }
    )
  }
}
