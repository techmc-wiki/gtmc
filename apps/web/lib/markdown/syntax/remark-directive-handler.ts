import type { Nodes, Root } from "mdast"
import type { Options as RemarkDirectiveOptions } from "remark-directive"
import type { VisitorResult } from "unist-util-visit"
import { SKIP, visit } from "unist-util-visit"
import {
  ANSI_COLOR_NAMES,
  createAnsiColorTagName,
} from "@/lib/markdown/ansi-colors"

interface RawFile extends Pick<RemarkDirectiveOptions, never> {
  value: string | Uint8Array
}

type TextDirective = Extract<Nodes, { type: "textDirective" }>
type LeafDirective = Extract<Nodes, { type: "leafDirective" }>

function handleTextDirective(
  node: TextDirective,
  index: number | undefined,
  parent: Nodes | undefined
): VisitorResult {
  if (node.name === "hidden") {
    node.data = node.data ?? {}
    node.data.hName = "hidden"
    return true
  }

  const color = ANSI_COLOR_NAMES.find((name) => name === node.name)
  if (color !== undefined) {
    node.data = node.data ?? {}
    node.data.hName = createAnsiColorTagName(color)
    return true
  }

  if (
    node.name === "advanced" &&
    parent?.type === "heading" &&
    index !== undefined
  ) {
    parent.data = parent.data ?? {}
    parent.data.hProperties = {
      ...parent.data.hProperties,
      "data-advanced": "true",
    }
    parent.children.splice(index, 1)
    return [SKIP, index]
  }

  return false
}

function handleLitematicaDirective(node: LeafDirective): boolean {
  if (node.name !== "litematica") return false

  node.data = node.data ?? {}
  node.data.hName = "litematicaviewer"
  node.data.hProperties = { ...node.attributes }
  return true
}

export function remarkDirectiveHandler() {
  return (tree: Root, file: RawFile): void => {
    const source = String(file.value)

    visit(tree, (node, index, parent) => {
      if (node.type !== "textDirective" && node.type !== "leafDirective") {
        return
      }

      if (node.type === "textDirective") {
        const result = handleTextDirective(node, index, parent)
        if (result !== false) return result
      } else if (handleLitematicaDirective(node)) {
        return
      }

      if (index === undefined || !parent) return

      const startOffset = node.position?.start.offset
      const endOffset = node.position?.end.offset
      if (startOffset === undefined || endOffset === undefined) return

      const value = source.slice(startOffset, endOffset)
      if (node.type === "textDirective") {
        parent.children[index] = { type: "text", value }
      } else {
        parent.children[index] = {
          type: "paragraph",
          children: [{ type: "text", value }],
        }
      }
      return [SKIP, index]
    })
  }
}
