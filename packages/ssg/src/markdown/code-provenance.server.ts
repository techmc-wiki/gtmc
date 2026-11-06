import { createHash } from "node:crypto"
import type { Code } from "mdast"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { visit } from "unist-util-visit"

import {
  CodeProvenanceSyntaxError,
  parseJavaCodeProvenance,
  type CodeReference,
} from "./code-provenance"

export function analyzeJavaCodeReferences(content: string): CodeReference[] {
  const tree = unified().use(remarkParse).parse(content)
  const references: CodeReference[] = []
  const hashOccurrences = new Map<string, number>()

  visit(tree, "code", (node: Code) => {
    if (node.lang?.toLowerCase() !== "java") return

    const markdownLine = node.position?.start.line ?? 1
    let provenance
    try {
      provenance = parseJavaCodeProvenance(node.meta)
    } catch (error) {
      if (error instanceof CodeProvenanceSyntaxError) {
        throw new CodeProvenanceSyntaxError(
          error.code,
          `Java code provenance at Markdown line ${markdownLine}: ${error.message}`,
          error.field
        )
      }
      throw error
    }

    const normalizedCode = node.value.replaceAll("\r\n", "\n")
    const codeHash = createHash("sha256").update(normalizedCode).digest("hex")
    const occurrence = (hashOccurrences.get(codeHash) ?? 0) + 1
    hashOccurrences.set(codeHash, occurrence)
    const shortHash = codeHash.slice(0, 12)

    references.push({
      id: `code-${shortHash}${occurrence > 1 ? `-${occurrence}` : ""}`,
      blockIndex: references.length,
      language: "java",
      codeHash,
      markdownLine,
      ...provenance,
    })
  })

  return references
}
