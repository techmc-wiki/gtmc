import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"
import { redirect, notFound } from "next/navigation"
import "katex/dist/katex.min.css"
import Link from "next/link"
import { TechButton } from "@/components/ui/tech-button"
import { MarkdownRenderer } from "@/lib/markdown"
import { getCachedRehypeShiki } from "@/lib/markdown/plugins/rehype-shiki"
import {
  getGitHubWriteToken,
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github/articles-repo"
import {
  mergePRAction,
  closePRAction,
  submitWithRebaseAction,
} from "@/actions/review"
import { createDraftFile, decodeStoredDraftFiles } from "@/lib/draft-files"
import { prisma } from "@/lib/prisma"
import type { RebaseState } from "@/types/rebase"
import type { RebaseAnalysis } from "@/lib/article-rebase"
import ConflictResolver from "./components/conflict-resolver"
import { ActionForm } from "./components/action-form"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/")
  }

  let authContext: Awaited<ReturnType<typeof getCurrentUserAuthContext>>
  try {
    authContext = await getCurrentUserAuthContext(session.user.id)
  } catch {
    redirect("/")
  }

  if (authContext.role !== "ADMIN") {
    redirect("/")
  }

  const { id } = await params
  const prNumber = parseInt(id, 10)
  if (isNaN(prNumber)) {
    notFound()
  }

  const token = getGitHubWriteToken(authContext.githubPat ?? undefined)
  const octokit = getOctokit(token)

  let pr: Awaited<ReturnType<typeof octokit.pulls.get>>["data"]
  try {
    pr = (await octokit.pulls.get({ owner, repo, pull_number: prNumber })).data
  } catch {
    notFound()
  }

  // Get PR files
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  })
  const mainFile = files.find((f) => f.filename.endsWith(".md")) || files[0]
  const linkedDraft = await prisma.revision.findFirst({
    where: { githubPrNum: prNumber },
  })
  const linkedDraftFiles = linkedDraft
    ? decodeStoredDraftFiles({
        content: linkedDraft.content,
        conflictContent: linkedDraft.conflictContent,
        filePath: linkedDraft.filePath,
      })
    : null

  let rawContent = ""
  if (mainFile) {
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: mainFile.filename,
        ref: pr.head.ref,
      })
      if (!Array.isArray(fileData) && fileData.type === "file") {
        rawContent = Buffer.from(fileData.content, "base64").toString("utf8")
      }
    } catch (e) {
      console.error(e)
      // maybe file was deleted or something
    }
  }

  const isMergeable = pr.mergeable === true
  const shikiPlugin = await getCachedRehypeShiki(rawContent)
  const hasConflict = pr.mergeable === false

  let rebaseAnalysis: RebaseAnalysis | null = null
  const rebaseState = linkedDraft?.rebaseState as RebaseState | null
  const isInReview =
    linkedDraft?.status === "IN_REVIEW" && !hasConflict && !rebaseState
  if (
    isInReview &&
    linkedDraftFiles?.files.length === 1 &&
    linkedDraft?.baseMainSha &&
    linkedDraft?.syncedMainSha &&
    linkedDraft.baseMainSha !== linkedDraft.syncedMainSha
  ) {
    const { analyzeRebaseNeed } = await import("@/lib/article-rebase")
    rebaseAnalysis = await analyzeRebaseNeed({
      filePath: linkedDraftFiles.files[0].filePath,
      baseMainSha: linkedDraft.baseMainSha,
      latestMainSha: linkedDraft.syncedMainSha,
      token,
    })
  }

  const fallbackConflictFile = createDraftFile({
    content: linkedDraft?.conflictContent || rawContent,
    filePath: mainFile?.filename || linkedDraft?.filePath || "",
  })
  const conflictDraftFiles = linkedDraftFiles || {
    activeFileId: fallbackConflictFile.id,
    files: [fallbackConflictFile],
  }
  const draftFileCount = linkedDraftFiles?.files.length || 1

  return (
    <div
      className="
        mx-auto max-w-6xl space-y-8 p-4 pb-32
        md:p-8
      ">
      <Link href="/review">
        <TechButton variant="ghost" size="sm">
          {"<"} BACK_TO_HUB
        </TechButton>
      </Link>

      <div
        className="
          relative flex flex-col items-end justify-between gap-4 border-b
          border-tech-main/30 pb-8
          md:flex-row
        ">
        <div
          className="
            absolute -bottom-1.25 left-0 size-2 border border-tech-main/50
            bg-tech-main/20
          "></div>
        <div>
          <h1
            className="
              mb-4 font-mono text-3xl/tight tracking-widest wrap-break-word
              text-tech-main-dark uppercase
              lg:text-4xl
            ">
            {pr.title} <span className="text-tech-main/50">#{pr.number}</span>
          </h1>
          <div
            className="
              inline-flex flex-wrap items-center gap-4 border
              border-tech-main/30 bg-tech-main/10 p-3 font-mono text-xs
              text-tech-main-dark
            ">
            <span className="text-tech-main">AUTHOR:</span>
            <span className="uppercase">
              {pr.user?.login || "UNKNOWN_USER"}
            </span>
            <span className="px-2 text-tech-main/50">{"//"}</span>
            <span className="text-tech-main">TARGET_FILE:</span>
            <span>
              {draftFileCount > 1
                ? `${draftFileCount} FILES`
                : mainFile?.filename || "UNKNOWN"}
            </span>
            <span className="px-2 text-tech-main/50">{"//"}</span>
            <span className="text-tech-main">STATUS:</span>
            <span
              className={
                hasConflict
                  ? "font-bold text-red-600"
                  : isMergeable
                    ? "font-bold text-green-600"
                    : "text-yellow-600"
              }>
              {pr.state.toUpperCase()} {hasConflict && "(CONFLICT)"}
            </span>
          </div>
        </div>

        {linkedDraftFiles?.files.length && linkedDraftFiles.files.length > 1 ? (
          <div
            className="
              mt-4 flex flex-wrap gap-2 border guide-line bg-white/60 p-3
              font-mono text-[0.6875rem] text-tech-main/70 uppercase
            ">
            {linkedDraftFiles.files.map((file) => (
              <span key={file.id} className="border guide-line px-2 py-1">
                {file.filePath || "PATH_NOT_SET"}
              </span>
            ))}
          </div>
        ) : null}

        {pr.state === "open" && (
          <div
            className="
              flex w-full gap-4
              md:w-auto
            ">
            <ActionForm
              action={async () => {
                "use server"
                await closePRAction(prNumber)
              }}>
              <TechButton
                type="submit"
                variant="secondary"
                className="
                  w-full border-red-600 text-red-600
                  hover:bg-red-600 hover:text-white
                ">
                CLOSE
              </TechButton>
            </ActionForm>
            {isMergeable && linkedDraft?.status !== "SYNC_CONFLICT" && (
              <ActionForm
                action={async () => {
                  "use server"
                  await mergePRAction(prNumber)
                }}>
                <TechButton type="submit" variant="primary" className="w-full">
                  APPROVE_&_MERGE
                </TechButton>
              </ActionForm>
            )}
          </div>
        )}
      </div>

      {rebaseAnalysis?.recommendation === "REBASE_RECOMMENDED" &&
        linkedDraft?.id && (
          <div
            className="
              flex flex-col gap-4 border border-yellow-500/50 bg-yellow-500/10
              p-4 font-mono text-sm text-tech-main-dark
            ">
            <div className="flex items-start gap-2">
              <span className="font-bold text-yellow-600">
                REBASE_ADVISORY:
              </span>
              <span>{rebaseAnalysis.adminMessage}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionForm
                action={async () => {
                  "use server"
                  await submitWithRebaseAction(linkedDraft.id)
                }}>
                <TechButton type="submit" variant="primary" size="sm">
                  FINE-GRAINED_REBASE
                </TechButton>
              </ActionForm>
              <ActionForm
                action={async () => {
                  "use server"
                  await mergePRAction(prNumber)
                }}>
                <TechButton type="submit" variant="secondary" size="sm">
                  QUICK_MERGE
                </TechButton>
              </ActionForm>
            </div>
          </div>
        )}

      {hasConflict || linkedDraft?.status === "SYNC_CONFLICT" ? (
        <ConflictResolver
          activeFileId={conflictDraftFiles.activeFileId}
          files={conflictDraftFiles.files}
          prNumber={prNumber}
          rebaseState={linkedDraft?.rebaseState as RebaseState | null}
          revisionId={linkedDraft?.id}
          conflictType={
            linkedDraft?.status === "SYNC_CONFLICT" &&
            linkedDraft?.conflictContent === null
              ? "FILE_DELETED"
              : "CONFLICT"
          }
        />
      ) : (
        <>
          <div>
            <h2
              className="
                mb-4 inline-block border-b border-tech-main/50 font-mono text-xl
                tracking-widest text-tech-main uppercase
              ">
              CONTENT_PREVIEW
            </h2>
          </div>
          {draftFileCount > 1 ? (
            <p className="mt-2 font-mono text-xs text-tech-main/60 uppercase">
              Previewing the primary markdown file from a multi-file draft.
            </p>
          ) : null}

          <div
            className="
              relative mx-auto border border-tech-main/30 bg-tech-main/5 p-8
              backdrop-blur-sm
            ">
            <div
              className="
                absolute top-0 left-0 size-2 border-t border-l
                border-tech-main/50
              "></div>
            <div
              className="
                absolute right-0 bottom-0 size-2 border-r border-b
                border-tech-main/50
              "></div>
            <div
              className="
                w-full max-w-none overflow-hidden wrap-break-word
                text-tech-main-dark
                selection:bg-tech-main/20 selection:text-tech-main-dark
              ">
              {rawContent ? (
                <MarkdownRenderer
                  content={rawContent}
                  rawPath={mainFile?.filename || ""}
                  shikiPlugin={shikiPlugin}
                />
              ) : (
                <div className="py-10 text-center font-mono opacity-50">
                  NO PREVIEW AVAILABLE
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
