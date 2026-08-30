import type { createRehypeShiki } from "../syntax/rehype-shiki"
import type { CodeReference } from "../code-provenance"
import { rehypeCJKSpacingBrowser } from "../transforms/rehype-cjk-spacing.browser"
import { buildRemarkPlugins, buildRehypePlugins } from "./core"

/**
 * Get the remark and rehype plugin configuration for React rendering.
 *
 * Used by markdown-renderer.tsx to configure ReactMarkdown.
 */
export function getPluginsForContent(
  content: string,
  rehypeShikiPlugin?: Awaited<ReturnType<typeof createRehypeShiki>>,
  codeReferences?: readonly CodeReference[]
) {
  return {
    remarkPlugins: buildRemarkPlugins(content, { includeMath: true }),
    rehypePlugins: buildRehypePlugins({
      includeShiki: !!rehypeShikiPlugin,
      shikiPlugin: rehypeShikiPlugin,
      codeReferences,
      includeMath: true,
      cjkSpacingPlugin: rehypeCJKSpacingBrowser,
    }),
  }
}
