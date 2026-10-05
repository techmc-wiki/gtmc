import type { Element, Root } from "hast"
import { visit } from "unist-util-visit"

import {
  formatCodeProvenanceLabel,
  formatLineRange,
  formatToolReference,
  JAVA_CODE_PROVENANCE_META_PROPERTY,
  parseJavaCodeProvenance,
  type CodeReference,
  type ResolvedJavaCodeProvenance,
} from "../code-provenance"

interface RehypeCodeProvenanceOptions {
  references?: readonly CodeReference[]
}

function getCodeNode(node: Element): Element | undefined {
  return node.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code"
  )
}

function isJavaCodeNode(node: Element): boolean {
  const classNames = Array.isArray(node.properties.className)
    ? node.properties.className
    : []
  return classNames.includes("language-java")
}

function takeFenceMeta(node: Element): string | undefined {
  const value = node.properties[JAVA_CODE_PROVENANCE_META_PROPERTY]
  delete node.properties[JAVA_CODE_PROVENANCE_META_PROPERTY]
  return typeof value === "string" ? value : undefined
}

function attachProvenance(
  node: Element,
  provenance: ResolvedJavaCodeProvenance,
  id: string,
  blockIndex: number
): void {
  node.properties.id = id
  node.properties["data-code-reference"] = "true"
  node.properties["data-code-reference-index"] = String(blockIndex)
  node.properties["data-mc"] = provenance.minecraftVersion
  node.properties["data-mapping"] = formatToolReference(provenance.mapping)
  node.properties["data-code-label"] = formatCodeProvenanceLabel(provenance)

  if (provenance.decompiler) {
    node.properties["data-decompiler"] = formatToolReference(
      provenance.decompiler
    )
  }
  if (provenance.file) {
    node.properties["data-source-file"] = provenance.file
  }
  if (provenance.lines) {
    node.properties["data-source-lines"] = formatLineRange(provenance.lines)
  }
}

export function rehypeCodeProvenance(
  options: RehypeCodeProvenanceOptions = {}
) {
  return function transformer(tree: Root): void {
    let javaBlockIndex = 0

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "pre") return
      const codeNode = getCodeNode(node)
      if (!codeNode || !isJavaCodeNode(codeNode)) return

      const blockIndex = javaBlockIndex
      javaBlockIndex += 1
      const fenceMeta = takeFenceMeta(codeNode)
      const generatedReference = options.references?.[blockIndex]

      if (generatedReference) {
        attachProvenance(
          node,
          generatedReference,
          generatedReference.id,
          blockIndex
        )
        return
      }

      try {
        const provenance = parseJavaCodeProvenance(fenceMeta)
        attachProvenance(
          node,
          provenance,
          `code-java-${blockIndex + 1}`,
          blockIndex
        )
      } catch {
        // Draft preview keeps malformed blocks readable; CodeMirror reports
        // the structured syntax diagnostic at the opening fence.
      }
    })
  }
}
