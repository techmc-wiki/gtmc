import type { MergeConflictBlock } from "@/lib/review/rebase-types"
import { diff3Merge } from "node-diff3"

// MergeConflictBlock type defined in types/rebase.ts (canonical location)

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

class NodeDiff3Adapter implements IMergeLibrary {
  merge(params: {
    baseContent: string
    draftContent: string
    latestMainContent: string
    labels?: { base?: string; draft?: string; main?: string }
  }): MergeResult {
    const draftLines = params.draftContent
      ? params.draftContent.replaceAll("\r\n", "\n").split("\n")
      : []
    const baseLines = params.baseContent
      ? params.baseContent.replaceAll("\r\n", "\n").split("\n")
      : []
    const mainLines = params.latestMainContent
      ? params.latestMainContent.replaceAll("\r\n", "\n").split("\n")
      : []

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
      content: contentLines.join("\n"),
    }
  }
}

export function getMergeLibrary(): IMergeLibrary {
  return new NodeDiff3Adapter()
}
