"use client"

import { useState, useMemo } from "react"
import type { RebaseState } from "@/types/rebase"

import { resolveConflictAction, abortRebaseAction } from "@/actions/review"
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _conflictType = conflictType
  const [content, setContent] = useState(initialContent)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAborting, setIsAborting] = useState(false)

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

  return (
    <div className="space-y-4">
      <div
        className="
          flex flex-col justify-between gap-4 border-l-4 border-amber-500
          bg-amber-500/10 p-4 text-amber-700
          sm:flex-row sm:items-center
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
              <p className="mt-1 text-xs opacity-80">
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
              className="
                shrink-0 border-red-600 text-red-600
                hover:bg-red-600 hover:text-white
              ">
              {isAborting ? "ABORTING..." : "ABORT REBASE"}
            </BrutalButton>
          )}
      </div>

      <div
        className="
        mb-8 space-y-2 border border-tech-main/30 bg-tech-main/5 p-2
      ">
        {blocks.map((block) => (
          <div key={block.id}>
            {block.type === "ok" ? (
              <pre
                className="
                  p-4 font-mono text-sm whitespace-pre-wrap text-tech-main-dark
                  opacity-70
                ">
                {block.content}
              </pre>
            ) : (
              <div className="my-4 flex flex-col border border-red-500/50">
                <div
                  className="
                    border-b border-red-500/30 bg-red-500/10 p-2 text-center
                    text-xs font-bold tracking-widest text-red-700 uppercase
                  ">
                  Conflict Block
                </div>
                <div
                  className="
                    flex flex-col divide-red-500/30
                    md:flex-row md:divide-x
                  ">
                  <div className="flex flex-1 flex-col bg-amber-500/5">
                    <div
                      className="
                        border-b border-amber-500/20 bg-amber-500/10 p-2 text-xs
                        font-bold text-amber-700
                      ">
                      YOUR CHANGES (draft)
                    </div>
                    <pre
                      className="
                        overflow-x-auto p-4 font-mono text-sm
                        whitespace-pre-wrap
                      ">
                      {block.ours}
                    </pre>
                    <div
                      className="
                        mt-auto border-t border-amber-500/20 bg-amber-500/5 p-2
                      ">
                      <BrutalButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="
                          w-full border-amber-500 text-amber-700
                          hover:bg-amber-500 hover:text-amber-900
                        "
                        onClick={() => handleAcceptBlock(block.id, block.ours)}>
                        ACCEPT OURS
                      </BrutalButton>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col bg-blue-500/5">
                    <div
                      className="
                        border-b border-blue-500/20 bg-blue-500/10 p-2 text-xs
                        font-bold text-blue-700
                      ">
                      MAIN CHANGES
                    </div>
                    <pre
                      className="
                        overflow-x-auto p-4 font-mono text-sm
                        whitespace-pre-wrap
                      ">
                      {block.theirs}
                    </pre>
                    <div
                      className="
                        mt-auto border-t border-blue-500/20 bg-blue-500/5 p-2
                      ">
                      <BrutalButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="
                          w-full border-blue-500 text-blue-700
                          hover:bg-blue-500 hover:text-blue-900
                        "
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
          <h3
            className="
              mb-2 font-mono text-sm font-bold tracking-widest uppercase
            ">
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
                min-h-[300px] w-full resize-y bg-transparent p-4 font-mono
                text-sm text-tech-main-dark outline-none
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
