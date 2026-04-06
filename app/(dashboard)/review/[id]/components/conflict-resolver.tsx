"use client"

import { useState, useMemo } from "react"
import type { RebaseState } from "@/types/rebase"

import { resolveConflictAction, abortRebaseAction } from "@/actions/review"
import { ReauthRequiredError } from "@/lib/admin-reauth"
import { TechButton } from "@/components/ui/tech-button"
import {
  getActiveDraftFile,
  normalizeDraftFileCollection,
  serializeDraftFilesPayload,
  type DraftFileCollection,
} from "@/lib/draft-files"

export default function ConflictResolver({
  activeFileId,
  files,
  prNumber,
  rebaseState,
  revisionId,
  conflictType = "CONFLICT",
}: {
  activeFileId: string
  files: DraftFileCollection["files"]
  prNumber: number
  rebaseState?: RebaseState | null
  revisionId?: string
  conflictType?: "CONFLICT" | "FILE_DELETED"
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _conflictType = conflictType
  const [draftCollection, setDraftCollection] = useState<DraftFileCollection>(
    () =>
      normalizeDraftFileCollection({
        activeFileId,
        files: files.map((file) => ({
          ...file,
          content: file.conflictContent ?? file.content,
          conflictContent: undefined,
        })),
      })
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAborting, setIsAborting] = useState(false)
  const activeFile = getActiveDraftFile(draftCollection)
  const content = activeFile.content

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

  function updateActiveFileContent(nextContent: string) {
    setDraftCollection((current) =>
      normalizeDraftFileCollection({
        ...current,
        files: current.files.map((file) =>
          file.id === current.activeFileId
            ? { ...file, content: nextContent }
            : file
        ),
      })
    )
  }

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
    updateActiveFileContent(newContent)
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
      if (error instanceof ReauthRequiredError) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
        return
      }
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
      if (error instanceof ReauthRequiredError) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
        return
      }
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
            <TechButton
              variant="secondary"
              size="sm"
              onClick={handleAbort}
              disabled={isAborting}
              className="
                shrink-0 border-red-600 text-red-600
                hover:bg-red-600 hover:text-white
              ">
              {isAborting ? "ABORTING..." : "ABORT REBASE"}
            </TechButton>
          )}
      </div>

      <div
        className="
          grid gap-4
          lg:grid-cols-[18rem_minmax(0,1fr)]
        ">
        {draftCollection.files.length > 1 ? (
          <aside className="border border-tech-main/30 bg-tech-main/5 p-2">
            <div
              className="
                p-2 font-mono text-xs tracking-widest text-tech-main uppercase
              ">
              CONFLICT_FILES_[{draftCollection.files.length}]
            </div>
            <div className="space-y-2">
              {draftCollection.files.map((file, index) => {
                const isActive = file.id === draftCollection.activeFileId
                const fileLabel =
                  file.filePath.split("/").filter(Boolean).at(-1) ||
                  `UNTITLED_FILE_${index + 1}`

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() =>
                      setDraftCollection((current) => ({
                        ...current,
                        activeFileId: file.id,
                      }))
                    }
                    className={`
                      flex min-h-11 w-full flex-col items-start gap-1 border
                      px-3 py-2 text-left transition-colors
                      ${
                        isActive
                          ? `border-tech-main bg-tech-main/10`
                          : `
                            guide-line bg-white/70
                            hover:border-tech-main/50 hover:bg-white/90
                          `
                      }
                    `}>
                    <span
                      className="
                        truncate font-mono text-xs tracking-widest
                        text-tech-main uppercase
                      ">
                      {fileLabel}
                    </span>
                    <span
                      className="
                        truncate font-mono text-[0.6875rem] text-tech-main/60
                      ">
                      {file.filePath || "PATH_NOT_SET"}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>
        ) : null}

        <div className="space-y-4">
          <div className="border border-tech-main/30 bg-white/70 px-4 py-3">
            <p
              className="
                font-mono text-xs tracking-widest text-tech-main uppercase
              ">
              ACTIVE_FILE_
            </p>
            <p className="mt-1 font-mono text-sm text-tech-main-dark">
              {activeFile.filePath || "PATH_NOT_SET"}
            </p>
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
                      p-4 font-mono text-sm whitespace-pre-wrap
                      text-tech-main-dark opacity-70
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
                            border-b border-amber-500/20 bg-amber-500/10 p-2
                            text-xs font-bold text-amber-700
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
                            mt-auto border-t border-amber-500/20 bg-amber-500/5
                            p-2
                          ">
                          <TechButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="
                              w-full border-amber-500 text-amber-700
                              hover:bg-amber-500 hover:text-amber-900
                            "
                            onClick={() =>
                              handleAcceptBlock(block.id, block.ours)
                            }>
                            ACCEPT OURS
                          </TechButton>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col bg-blue-500/5">
                        <div
                          className="
                            border-b border-blue-500/20 bg-blue-500/10 p-2
                            text-xs font-bold text-blue-700
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
                            mt-auto border-t border-blue-500/20 bg-blue-500/5
                            p-2
                          ">
                          <TechButton
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
                          </TechButton>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form action={handleResolve} className="space-y-4">
            <input
              type="hidden"
              name="draftFiles"
              value={serializeDraftFilesPayload(draftCollection)}
            />
            <input type="hidden" name="content" value={content} />

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
                  onChange={(event) =>
                    updateActiveFileContent(event.target.value)
                  }
                  className="
                    min-h-[300px] w-full resize-y bg-transparent p-4 font-mono
                    text-sm text-tech-main-dark outline-none
                  "
                />
              </div>
            </div>

            <TechButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "RESOLVING..." : "RESOLVE & UPDATE PR"}
            </TechButton>
          </form>
        </div>
      </div>
    </div>
  )
}
