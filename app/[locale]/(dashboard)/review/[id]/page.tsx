import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"
import { redirect, notFound } from "next/navigation"
import "katex/dist/katex.min.css"
import { Link } from "@/i18n/navigation"
import { TechButton } from "@/components/ui/tech-button"
import {
  getGitHubWriteToken,
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github/articles-repo"
import { mergePRAction, closePRAction } from "@/actions/review"
import { decodeStoredDraftFiles } from "@/lib/draft-files"
import { prisma } from "@/lib/prisma"
import { ReviewEditor } from "@/components/review/review-editor"
import type { ModeAnalysis, ReviewFile } from "@/types/review"
import { PRActionButtons } from "./components/pr-action-buttons"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME

function getPrimaryAnalysisPath(filePaths: string[], fallbackPath?: string) {
  return (
    filePaths.find((filePath) => filePath.endsWith(".md")) ||
    filePaths[0] ||
    fallbackPath ||
    ""
  )
}

async function getPRFileContents({
  octokit,
  prRef,
  filePaths,
}: {
  octokit: ReturnType<typeof getOctokit>
  prRef: string
  filePaths: string[]
}) {
  const entries = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: prRef,
        })

        if (Array.isArray(data) || data.type !== "file") {
          return [filePath, null] as const
        }

        return [
          filePath,
          Buffer.from(data.content, "base64").toString("utf8"),
        ] as const
      } catch (error) {
        console.error(
          "[review/page] getPRFileContents failed for",
          filePath,
          error
        )
        return [filePath, null] as const
      }
    })
  )

  return Object.fromEntries(entries)
}

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
  } catch (error) {
    console.error("[review/page] auth context failed:", error)
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
  } catch (error) {
    console.error("[review/page] PR fetch failed:", prNumber, error)
    notFound()
  }

  const { data: prFiles } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  })
  const primaryPrFile =
    prFiles.find((file) => file.filename.endsWith(".md")) || prFiles[0]

  const linkedDraft = await prisma.revision.findFirst({
    where: { githubPrNum: prNumber },
  })
  const linkedDraftConflictMode =
    (
      linkedDraft as
        | (typeof linkedDraft & { conflictMode?: string | null })
        | null
    )?.conflictMode ?? null
  const effectiveConflictMode =
    linkedDraft?.status === "SYNC_CONFLICT" && !linkedDraftConflictMode
      ? "SIMPLE"
      : linkedDraftConflictMode

  const linkedDraftFiles = linkedDraft
    ? decodeStoredDraftFiles({
        content: linkedDraft.content,
        conflictContent: linkedDraft.conflictContent,
        filePath: linkedDraft.filePath,
      })
    : null

  const draftFilePaths =
    linkedDraftFiles?.files.map((file) => file.filePath) ?? []
  const prFileContents = linkedDraftFiles
    ? await getPRFileContents({
        octokit,
        prRef: pr.head.ref,
        filePaths: draftFilePaths,
      })
    : {}

  let modeAnalysis: ModeAnalysis = {
    recommendation: "SIMPLE",
    commitCount: 0,
    filesAffected: 0,
    adminMessage: "No analysis available.",
  }

  const hasConflict = pr.mergeable === false
  const isMergeable = pr.mergeable === true
  const isInReview = linkedDraft?.status === "IN_REVIEW" && !hasConflict
  const analysisFilePath = getPrimaryAnalysisPath(
    draftFilePaths,
    primaryPrFile?.filename
  )

  if (
    isInReview &&
    linkedDraft?.baseMainSha &&
    linkedDraft?.syncedMainSha &&
    linkedDraft.baseMainSha !== linkedDraft.syncedMainSha &&
    analysisFilePath
  ) {
    const { analyzeRebaseNeed } = await import("@/lib/article-rebase")
    const rebaseAnalysis = await analyzeRebaseNeed({
      filePath: analysisFilePath,
      baseMainSha: linkedDraft.baseMainSha,
      latestMainSha: linkedDraft.syncedMainSha,
      token,
    })

    modeAnalysis = {
      recommendation:
        rebaseAnalysis?.recommendation === "REBASE_RECOMMENDED"
          ? "FINE_GRAINED"
          : "SIMPLE",
      commitCount: rebaseAnalysis?.totalCommits ?? 0,
      filesAffected: rebaseAnalysis?.fileEditCount ?? 0,
      adminMessage: rebaseAnalysis?.adminMessage ?? "No analysis available.",
    }
  }

  const reviewFiles: ReviewFile[] = linkedDraftFiles
    ? linkedDraftFiles.files.map((file) => ({
        id: file.id,
        filePath: file.filePath,
        content: prFileContents[file.filePath] ?? file.content,
        originalContent: file.content,
        conflictContent: file.conflictContent ?? undefined,
        status: file.conflictContent
          ? ("conflict" as const)
          : ("clean" as const),
      }))
    : []

  const targetFileLabel =
    linkedDraftFiles?.files.length && linkedDraftFiles.files.length > 1
      ? `${linkedDraftFiles.files.length} FILES`
      : primaryPrFile?.filename || linkedDraft?.filePath || "UNKNOWN"

  const defaultCommitTitle = `${pr.title} (#${pr.number})`
  const defaultCommitBody = pr.body || ""
  const coauthorLines = defaultCommitBody
    .split("\n")
    .filter((line) => /^Co-authored-by: .+$/.test(line))

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
            <span>{targetFileLabel}</span>
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

        {pr.state === "open" && (
          <PRActionButtons
            closePRAction={async () => {
              "use server"
              await closePRAction(prNumber)
            }}
            mergePRAction={
              isMergeable &&
              linkedDraft?.status !== "SYNC_CONFLICT" &&
              !effectiveConflictMode
                ? async () => {
                    "use server"
                    await mergePRAction(prNumber)
                  }
                : null
            }
          />
        )}
      </div>

      {linkedDraft ? (
        <ReviewEditor
          pr={{ number: pr.number, title: pr.title, htmlUrl: pr.html_url }}
          files={reviewFiles}
          modeAnalysis={modeAnalysis}
          revision={{
            id: linkedDraft.id,
            conflictMode: effectiveConflictMode,
            rebaseState: linkedDraft.rebaseState,
          }}
          squashCommitDefaults={{
            title: defaultCommitTitle,
            body: defaultCommitBody,
            coauthorLines,
          }}
        />
      ) : (
        <div
          className="
            border border-tech-main/30 bg-tech-main/5 px-6 py-10 font-mono
            text-sm tracking-widest text-tech-main/70 uppercase
          ">
          NO_DRAFT_LINKED_
        </div>
      )}
    </div>
  )
}
