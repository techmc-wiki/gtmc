"use client"

import { useState, useMemo } from "react"
import type { RebaseState } from "@/types/rebase"

import {
  resolveConflictAction,
  abortRebaseAction,
  keepFileAction,
} from "@/actions/review"
import { BrutalButton } from "@/components/ui/brutal-button"

export default function ConflictResolver({
  filePath,
  initialContent,
  prNumber,
  rebaseState,
  revisionId,
  conflictType = "CONFLICT",
}: {
  filePath: string
  initialContent: string
  prNumber: number
  rebaseState?: RebaseState | null
  revisionId?: string
  conflictType?: "CONFLICT" | "FILE_DELETED"
}) {
  const [content, setContent] = useState(initialContent)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAborting, setIsAborting] = useState(false)
  const [isKeeping, setIsKeeping] = useState(false)

  type ConflictBlock =
    | { type: "ok"; content: string; id: string }
    | { type: "conflict"; ours: string; theirs: string; id: string }

  const blocks = useMemo<ConflictBlock[]>(() => {
    const regex = /<<<<<<< draft\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> main\n/g
    const result: ConflictBlock[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null = regex.exec(content)

    while (match !== null) {
      if (match.index > lastIndex) {
        result.push({
          type: "ok",
          content: content.substring(lastIndex, match.index),
          id: `ok-${lastIndex}`,
        })
      }
      result.push({
        type: "conflict",
        ours: match[1],
        theirs: match[2],
        id: `conflict-${match.index}`,
      })
      lastIndex = regex.lastIndex
      match = regex.exec(content)
    }

    if (lastIndex < content.length) {
      result.push({
        type: "ok",
        content: content.substring(lastIndex),
        id: `ok-${lastIndex}`,
      })
    }

    return result.length > 0 ? result : [{ type: "ok", content, id: "ok-0" }]
  }, [content])

  function handleAcceptBlock(id: string, text: string) {
    const newContent = blocks
      .map((b) => {
        if (b.id === id) {
          return text
        }
        if (b.type === "conflict") {
          return `<<<<<<< draft\n${b.ours}=======\n${b.theirs}>>>>>>> main\n`
        }
        return b.content
      })
      .join("")
    setContent(newContent)
  }

  async function handleAbort() {
    if (!revisionId) return
    if (
      !confirm(
        "Are you sure you want to abort this rebase? All progress will be lost."
      )
    )
      return

    setIsAborting(true)
    try {
      await abortRebaseAction(revisionId)
      window.location.reload()
    } catch (error) {
      alert(
        `Failed to abort rebase: ${error instanceof Error ? error.message : String(error)}`
      )
      setIsAborting(false)
    }
  }

  async function handleResolve(formData: FormData) {
    setIsSubmitting(true)
    try {
      await resolveConflictAction(prNumber, formData)
      window.location.reload()
    } catch (error) {
      alert(
        `Failed to resolve conflict: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleKeepFile() {
    if (!revisionId) return
    setIsKeeping(true)
    try {
      await keepFileAction(revisionId)
      window.location.reload()
    } catch (error) {
      alert(
        `Failed to keep file: ${error instanceof Error ? error.message : String(error)}`
      )
      setIsKeeping(false)
    }
  }

  if (conflictType === "FILE_DELETED") {
    return (
      <div className="space-y-4">
        <div className="border-l-4 border-red-600 bg-red-600/10 p-4 text-red-700 flex flex-col gap-2">
          <p className="font-bold tracking-widest uppercase">
            File Deletion Conflict
          </p>
          <p className="text-sm">
            The main branch deleted this file, but your draft has modifications.
            Choose how to proceed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <BrutalButton
            type="button"
            variant="primary"
            onClick={handleKeepFile}
            disabled={isKeeping}
            className="flex-1">
            {isKeeping ? "APPLYING..." : "KEEP MY CHANGES"}
          </BrutalButton>
          <BrutalButton
            type="button"
            variant="secondary"
            onClick={async () => {
              if (
                !confirm(
                  "This will close the PR and discard your draft. Are you sure?"
                )
              )
                return
              try {
                const { closePRAction } = await import("@/actions/review")
                await closePRAction(prNumber)
                window.location.href = "/review"
              } catch (error) {
                alert(
                  `Failed: ${error instanceof Error ? error.message : String(error)}`
                )
              }
            }}
            className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
            ACCEPT DELETION
          </BrutalButton>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className="
          border-l-4 border-amber-500 bg-amber-500/10 p-4 text-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4
        ">
        <div>
          <p className="font-bold tracking-widest uppercase">
            Admin Resolution Required
          </p>
          <p className="text-sm">
            {rebaseState?.status === "CONFLICT"
              ? `Resolving commit ${rebaseState.currentCommitIndex + 1} of ${rebaseState.commitShas.length}`
              : "Edit the merged result below, then update the PR branch with the resolved content."}
          </p>
          {rebaseState?.status === "CONFLICT" &&
            rebaseState.commitInfos[rebaseState.currentCommitIndex] && (
              <p className="text-xs mt-1 opacity-80">
                Conflict in:{" "}
                <span className="font-mono">
                  {
                    rebaseState.commitInfos[rebaseState.currentCommitIndex]
                      .message
                  }
                </span>{" "}
                (
                {rebaseState.commitInfos[rebaseState.currentCommitIndex].author}
                )
              </p>
            )}
        </div>
        {rebaseState &&
          (rebaseState.status === "CONFLICT" ||
            rebaseState.status === "IN_PROGRESS") && (
            <BrutalButton
              variant="secondary"
              size="sm"
              onClick={handleAbort}
              disabled={isAborting}
              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white flex-shrink-0">
              {isAborting ? "ABORTING..." : "ABORT REBASE"}
            </BrutalButton>
          )}
      </div>

      <div className="space-y-2 mb-8 border border-tech-main/30 bg-tech-main/5 p-2">
        {blocks.map((block) => (
          <div key={block.id}>
            {block.type === "ok" ? (
              <pre className="p-4 font-mono text-sm whitespace-pre-wrap text-tech-main-dark opacity-70">
                {block.content}
              </pre>
            ) : (
              <div className="border border-red-500/50 my-4 flex flex-col">
                <div className="bg-red-500/10 p-2 text-xs font-bold text-red-700 text-center tracking-widest uppercase border-b border-red-500/30">
                  Conflict Block
                </div>
                <div className="flex flex-col md:flex-row md:divide-x divide-red-500/30">
                  <div className="flex-1 flex flex-col bg-amber-500/5">
                    <div className="p-2 text-xs font-bold text-amber-700 bg-amber-500/10 border-b border-amber-500/20">
                      YOUR CHANGES (draft)
                    </div>
                    <pre className="p-4 font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                      {block.ours}
                    </pre>
                    <div className="p-2 mt-auto border-t border-amber-500/20 bg-amber-500/5">
                      <BrutalButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full text-amber-700 border-amber-500 hover:bg-amber-500 hover:text-amber-900"
                        onClick={() => handleAcceptBlock(block.id, block.ours)}>
                        ACCEPT OURS
                      </BrutalButton>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col bg-blue-500/5">
                    <div className="p-2 text-xs font-bold text-blue-700 bg-blue-500/10 border-b border-blue-500/20">
                      MAIN CHANGES
                    </div>
                    <pre className="p-4 font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                      {block.theirs}
                    </pre>
                    <div className="p-2 mt-auto border-t border-blue-500/20 bg-blue-500/5">
                      <BrutalButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full text-blue-700 border-blue-500 hover:bg-blue-500 hover:text-blue-900"
                        onClick={() =>
                          handleAcceptBlock(block.id, block.theirs)
                        }>
                        ACCEPT THEIRS
                      </BrutalButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <form action={handleResolve} className="space-y-4">
        <input type="hidden" name="filePath" value={filePath} />

        <div className="mt-8 border-t border-tech-main/30 pt-4">
          <h3 className="font-mono text-sm font-bold tracking-widest uppercase mb-2">
            Raw Editor Fallback
          </h3>
          <div
            className="
              relative border border-tech-main/30 bg-tech-main/5 p-1
              focus-within:border-tech-main
            ">
            <textarea
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="
                min-h-[300px] w-full resize-y bg-transparent p-4 font-mono text-sm
                text-tech-main-dark outline-none
              "
            />
          </div>
        </div>

        <BrutalButton type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "RESOLVING..." : "RESOLVE & UPDATE PR"}
        </BrutalButton>
      </form>
    </div>
  )
}
