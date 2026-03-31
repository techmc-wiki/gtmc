import { diff3Merge } from "node-diff3"

export interface MergeConflictBlock {
  type: "conflict"
  ours: string[]
  base: string[]
  theirs: string[]
}

export interface MergeOkBlock {
  type: "ok"
  lines: string[]
}

export type MergeBlock = MergeConflictBlock | MergeOkBlock

export interface MergeResult {
  conflict: boolean
  blocks: MergeBlock[]
  content: string
}

export interface IMergeLibrary {
  merge(params: {
    baseContent: string
    draftContent: string
    latestMainContent: string
    labels?: { base?: string; draft?: string; main?: string }
  }): MergeResult
}

function splitLines(content: string): string[] {
  if (!content) return []
  return content.replace(/\r\n/g, "\n").split("\n")
}

function joinLines(lines: string[]): string {
  return lines.join("\n")
}

class NodeDiff3Adapter implements IMergeLibrary {
  merge(params: {
    baseContent: string
    draftContent: string
    latestMainContent: string
    labels?: { base?: string; draft?: string; main?: string }
  }): MergeResult {
    const draftLines = splitLines(params.draftContent)
    const baseLines = splitLines(params.baseContent)
    const mainLines = splitLines(params.latestMainContent)

    const diff3Result = diff3Merge(draftLines, baseLines, mainLines)

    const blocks: MergeBlock[] = []
    let hasConflict = false
    const contentLines: string[] = []

    for (const block of diff3Result) {
      if ("ok" in block && block.ok) {
        blocks.push({ type: "ok", lines: block.ok })
        contentLines.push(...block.ok)
      } else if ("conflict" in block && block.conflict) {
        hasConflict = true
        const conflict = block.conflict
        const a = conflict.a || []
        const o = conflict.o || []
        const b = conflict.b || []

        blocks.push({
          type: "conflict",
          ours: a,
          base: o,
          theirs: b,
        })

        const draftLabel = params.labels?.draft || "draft"
        const mainLabel = params.labels?.main || "main"

        contentLines.push(`<<<<<<< ${draftLabel}`)
        contentLines.push(...a)
        contentLines.push("=======")
        contentLines.push(...b)
        contentLines.push(`>>>>>>> ${mainLabel}`)
      }
    }

    return {
      conflict: hasConflict,
      blocks,
      content: joinLines(contentLines),
    }
  }
}

export function getMergeLibrary(): IMergeLibrary {
  return new NodeDiff3Adapter()
}
