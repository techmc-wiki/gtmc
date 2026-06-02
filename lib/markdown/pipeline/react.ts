import type { createRehypeShiki } from "../syntax/rehype-shiki"
import { buildRemarkPlugins, buildRehypePlugins } from "./core"

/**
 * Get the remark and rehype plugin configuration for React rendering.
 *
 * Used by markdown-renderer.tsx to configure ReactMarkdown.
 */
export function getPluginsForContent(
  content: string,
  rehypeShikiPlugin?: Awaited<ReturnType<typeof createRehypeShiki>>
) {
  return {
    remarkPlugins: buildRemarkPlugins(content, { includeMath: true }),
    rehypePlugins: buildRehypePlugins({
      includeShiki: !!rehypeShikiPlugin,
      shikiPlugin: rehypeShikiPlugin,
      includeMath: true,
    }),
  }
}
