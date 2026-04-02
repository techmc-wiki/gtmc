import { encodeSlug } from "@/lib/slug-utils"

/**
 * Constructs a consistent article URL with proper encoding.
 * Encodes each slug segment individually to match tree-node.tsx pattern.
 * @param slug - The article slug (e.g., "tree-farm/basics" or "Chapter 1/Section 2")
 * @returns The encoded article URL (e.g., "/articles/tree-farm/basics" or "/articles/Chapter%201/Section%202")
 */
export function articleUrl(slug: string): string {
  return `/articles/${encodeSlug(slug)}`
}
