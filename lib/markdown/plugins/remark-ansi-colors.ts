import type { Content, Html, Parent, Root, Text } from "mdast"
import { visit } from "unist-util-visit"
import {
  ANSI_COLOR_TAG_PATTERN,
  createAnsiColorTagName,
  type AnsiColorName,
} from "@/lib/markdown/ansi-colors"

function isParentNode(node: unknown): node is Parent {
  return Array.isArray((node as Parent | undefined)?.children)
}

function replaceAnsiColorMarkup(value: string): Content[] | null {
  ANSI_COLOR_TAG_PATTERN.lastIndex = 0

  const nextChildren: Content[] = []
  let lastIndex = 0
  let hasMatch = false

  for (const match of value.matchAll(ANSI_COLOR_TAG_PATTERN)) {
    const fullMatch = match[0]
    const color = match[1] as AnsiColorName
    const innerText = match[2] ?? ""
    const matchIndex = match.index ?? 0

    if (matchIndex > lastIndex) {
      nextChildren.push({
        type: "text",
        value: value.slice(lastIndex, matchIndex),
      })
    }

    const tagName = createAnsiColorTagName(color)

    nextChildren.push({ type: "html", value: `<${tagName}>` } as Html)
    if (innerText.length > 0) {
      nextChildren.push({ type: "text", value: innerText } as Text)
    }
    nextChildren.push({ type: "html", value: `</${tagName}>` } as Html)

    lastIndex = matchIndex + fullMatch.length
    hasMatch = true
  }

  if (!hasMatch) return null

  if (lastIndex < value.length) {
    nextChildren.push({ type: "text", value: value.slice(lastIndex) })
  }

  return nextChildren
}

export function remarkAnsiColors() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (!isParentNode(node)) return

      const nextChildren: Content[] = []
      let didChange = false

      for (const child of node.children) {
        if (child.type !== "text") {
          nextChildren.push(child)
          continue
        }

        const replacement = replaceAnsiColorMarkup(child.value)
        if (replacement === null) {
          nextChildren.push(child)
          continue
        }

        nextChildren.push(...replacement)
        didChange = true
      }

      if (didChange) {
        node.children = nextChildren
      }
    })
  }
}
