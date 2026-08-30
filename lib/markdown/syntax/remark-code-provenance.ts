import type { Code, Root } from "mdast"
import { visit } from "unist-util-visit"

import { JAVA_CODE_PROVENANCE_META_PROPERTY } from "../code-provenance"

export function remarkCodeProvenance() {
  return function transformer(tree: Root): void {
    visit(tree, "code", (node: Code) => {
      if (node.lang?.toLowerCase() !== "java" || !node.meta) return

      node.data = node.data ?? {}
      node.data.hProperties = {
        ...node.data.hProperties,
        [JAVA_CODE_PROVENANCE_META_PROPERTY]: node.meta,
      }
    })
  }
}
