import type { Element, Parent, Root, Text } from "hast"
import { SKIP, visit } from "unist-util-visit"

export const MERMAID_DIAGRAM_TAG = "mermaid-diagram"

export function rehypeMermaid() {
  return (tree: Root): void => {
    visit(
      tree,
      "element",
      (node: Element, index, parent: Parent | undefined) => {
        if (node.tagName !== "pre" || index === undefined || !parent) return

        const codeNode = node.children.find(
          (child): child is Element =>
            child.type === "element" && child.tagName === "code"
        )
        if (!codeNode || !isMermaidCode(codeNode)) return

        parent.children[index] = {
          type: "element",
          tagName: MERMAID_DIAGRAM_TAG,
          properties: { "data-mermaid-diagram": true },
          children: [{ type: "text", value: getTextContent(codeNode) }],
        }

        return [SKIP, index]
      }
    )
  }
}

function isMermaidCode(node: Element): boolean {
  const classNames = Array.isArray(node.properties.className)
    ? node.properties.className
    : []

  return classNames.includes("language-mermaid")
}

function getTextContent(node: Element | Text): string {
  if (node.type === "text") return node.value

  return node.children
    .map((child) => {
      if (child.type === "text") return child.value
      if (child.type === "element") return getTextContent(child)
      return ""
    })
    .join("")
}
