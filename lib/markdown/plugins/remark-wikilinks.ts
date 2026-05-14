import type { Root, Paragraph, Text, Image, Link } from "mdast"
import { visit } from "unist-util-visit"

/**
 * Regex for Obsidian-style wikilinks.
 *
 * Captures two groups:
 *   1. An optional `!` prefix indicating an image wikilink
 *   2. The inner content between `[[` and `]]`
 *
 * Matches:
 *   - `![[filename.png]]`        (image)
 *   - `[[display|target]]`       (link with display text)
 *   - `[[target]]`               (link without display text)
 */
const WIKILINK_REGEX = /(!?)\[\[([^\]]+)\]\]/g

/**
 * Encode URL-invalid characters (spaces, Chinese, `#`, `?`) while preserving
 * path separators and other valid URL characters.
 */
function urlEncode(str: string): string {
  return encodeURI(str).replace(/#/g, "%23").replace(/\?/g, "%3F")
}

/**
 * Remark plugin that transforms Obsidian-style wikilinks into proper mdast
 * nodes.
 *
 * Image wikilinks (`![[filename.png]]`) are converted to mdast `Image` nodes.
 * Link wikilinks (`[[display text|target]]` or `[[target]]`) are converted to
 * mdast `Link` nodes.
 *
 * Must run after remark-parse but can run at any point in the remark plugin
 * chain since it operates on text nodes within paragraphs.
 */
export function remarkWikilinks() {
  return (tree: Root) => {
    if (!tree || !tree.children) return

    visit(tree, "paragraph", (node: Paragraph) => {
      if (!node.children || node.children.length === 0) return

      const newChildren: Paragraph["children"] = []

      for (const child of node.children) {
        if (child.type !== "text") {
          newChildren.push(child)
          continue
        }

        const text = (child as Text).value
        let hasMatch = false
        let lastIndex = 0
        let match: RegExpExecArray | null

        // Reset regex state before each text node
        WIKILINK_REGEX.lastIndex = 0

        while ((match = WIKILINK_REGEX.exec(text)) !== null) {
          hasMatch = true
          const isImage = match[1] === "!"
          const inner = match[2]
          const matchStart = match.index
          const matchLength = match[0].length

          // Push any plain text before this wikilink
          if (matchStart > lastIndex) {
            newChildren.push({
              type: "text",
              value: text.slice(lastIndex, matchStart),
            } as Text)
          }

          if (isImage) {
            // Image wikilink: ![[filename.ext]] or ![[filename.ext|alt]]
            const pipeIndex = inner.indexOf("|")
            const filename = pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner
            const alt = pipeIndex >= 0 ? inner.slice(pipeIndex + 1) : filename

            newChildren.push({
              type: "image",
              url: urlEncode(filename),
              alt: alt,
              title: null,
            } as Image)
          } else {
            // Link wikilink: [[target]] or [[display|target]]
            const pipeIndex = inner.indexOf("|")
            const display = pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner
            const target = pipeIndex >= 0 ? inner.slice(pipeIndex + 1) : inner

            newChildren.push({
              type: "link",
              url: urlEncode(target),
              title: null,
              children: [{ type: "text", value: display } as Text],
            } as Link)
          }

          lastIndex = matchStart + matchLength
        }

        if (hasMatch) {
          // Push remaining text after the last match
          if (lastIndex < text.length) {
            newChildren.push({
              type: "text",
              value: text.slice(lastIndex),
            } as Text)
          }
        } else {
          // No wikilinks in this text node — keep as-is
          newChildren.push(child)
        }
      }

      node.children = newChildren
    })
  }
}
