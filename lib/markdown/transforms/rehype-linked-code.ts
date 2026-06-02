import type { Element, Root } from "hast"
import { visit } from "unist-util-visit"

/**
 * Rehype plugin that marks code-in-link and link-in-code patterns
 * with data attributes for styling.
 */
export function rehypeLinkedCode() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "a") {
        const codeChild = node.children?.some(
          (c) => c.type === "element" && (c as Element).tagName === "code"
        )
        if (codeChild) {
          node.properties = node.properties || {}
          node.properties["data-has-code"] = "true"
          node.children?.forEach((c) => {
            if (c.type === "element" && (c as Element).tagName === "code") {
              ;(c as Element).properties = (c as Element).properties || {}
              ;(c as Element).properties["data-linked-code"] = "true"
            }
          })
        }
      }
      if (node.tagName === "code") {
        const linkChild = node.children?.some(
          (c) => c.type === "element" && (c as Element).tagName === "a"
        )
        if (linkChild) {
          node.properties = node.properties || {}
          node.properties["data-has-link"] = "true"
          node.children?.forEach((c) => {
            if (c.type === "element" && (c as Element).tagName === "a") {
              ;(c as Element).properties = (c as Element).properties || {}
              ;(c as Element).properties["data-in-code"] = "true"
            }
          })
        }
      }
    })
  }
}
