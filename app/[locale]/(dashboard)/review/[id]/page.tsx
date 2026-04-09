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
import { analyzeReviewMergeStrategy } from "@/lib/github/pr-manager"
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
  const prFileMap = new Map(prFiles.map((file) => [file.filename, file]))
  const primaryPrFile =
    prFiles.find((file) => file.filename.endsWith(".md")) || prFiles[0]

  const linkedDraft = await prisma.revision.findFirst({
    where: { githubPrNum: prNumber },
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })
  const linkedDraftConflictMode =
    (
      linkedDraft as
        | (typeof linkedDraft & { conflictMode?: string | null })
        | null
    )?.conflictMode ?? null
  console.log("[review/page] linkedDraft", {
    id: linkedDraft?.id,
    status: linkedDraft?.status,
    conflictMode: linkedDraftConflictMode,
    conflictContentLength: linkedDraft?.conflictContent?.length ?? null,
    conflictContentPreview: linkedDraft?.conflictContent?.slice(0, 100) ?? null,
  })
  const effectiveConflictMode = linkedDraftConflictMode ?? null

  const linkedDraftFiles = linkedDraft
    ? decodeStoredDraftFiles({
        content: linkedDraft.content,
        conflictContent: linkedDraft.conflictContent,
        filePath: linkedDraft.filePath,
      })
    : null
  console.log("[review/page] linkedDraftFiles", {
    fileCount: linkedDraftFiles?.files.length ?? null,
    files:
      linkedDraftFiles?.files.map((f) => ({
        filePath: f.filePath,
        hasConflictContent: Boolean(f.conflictContent),
        conflictContentLength: f.conflictContent?.length ?? null,
        conflictContentPreview: f.conflictContent?.slice(0, 80) ?? null,
      })) ?? null,
  })

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
  console.log("[review/page] pr.mergeable", {
    prNumber,
    mergeable: pr.mergeable,
    hasConflict,
    isMergeable,
    isInReview,
    effectiveConflictMode,
  })
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
        ...(prFileMap.get(file.filePath)
          ? {
              additions: prFileMap.get(file.filePath)?.additions,
              changeType: prFileMap.get(file.filePath)?.status as
                | "added"
                | "modified"
                | "removed"
                | "renamed"
                | undefined,
              deletions: prFileMap.get(file.filePath)?.deletions,
            }
          : {}),
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
  console.log(
    "[review/page] reviewFiles",
    reviewFiles.map((f) => ({
      filePath: f.filePath,
      status: f.status,
      hasConflictContent: Boolean(f.conflictContent),
      conflictContentPreview: f.conflictContent?.slice(0, 80) ?? null,
      contentPreview: f.content?.slice(0, 80),
    }))
  )

  const targetFileLabel =
    linkedDraftFiles?.files.length && linkedDraftFiles.files.length > 1
      ? `${linkedDraftFiles.files.length} FILES`
      : primaryPrFile?.filename || linkedDraft?.filePath || "UNKNOWN"

  const defaultCommitTitle = `${pr.title} (#${pr.number})`
  const defaultCommitBody = pr.body || ""
  const coauthorLines = defaultCommitBody
    .split("\n")
    .filter((line) => /^Co-authored-by: .+$/.test(line))
  const mergeStrategyAnalysis = analyzeReviewMergeStrategy(pr)
  const mergeBlockedReason =
    pr.state !== "open"
      ? "Pull request is already closed."
      : linkedDraft?.status === "SYNC_CONFLICT"
        ? "Resolve sync conflicts before landing this pull request."
        : effectiveConflictMode
          ? "Finish the current review resolution before landing this pull request."
          : !isMergeable
            ? "GitHub still reports this pull request as not mergeable."
            : null

  return (
    <div className="mx-auto max-w-[88rem] space-y-8 p-4 pb-32 md:p-8">
      <Link href="/review">
        <TechButton variant="ghost" size="sm">
          {"<"} BACK_TO_HUB
        </TechButton>
      </Link>

      <section className="relative border-b border-tech-main/30 pb-8">
        <div className="absolute -bottom-1.25 left-0 size-2 border border-tech-main/50 bg-tech-main/20"></div>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[0.6875rem] tracking-widest uppercase">
              <span
                className={`border px-2 py-1 ${
                  hasConflict
                    ? "border-red-500/50 bg-red-500/10 text-red-600"
                    : isMergeable
                      ? "border-green-600/40 bg-green-500/10 text-green-700"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-700"
                }`}>
                {pr.state.toUpperCase()} {hasConflict ? "CONFLICT" : "READY"}
              </span>
              <span className="border border-tech-main/25 bg-white/70 px-2 py-1 text-tech-main/70">
                PR #{pr.number}
              </span>
              <span className="border border-tech-main/25 bg-white/70 px-2 py-1 text-tech-main/70">
                {pr.base.ref} ← {pr.head.ref}
              </span>
            </div>

            <h1 className="font-mono text-3xl/tight tracking-widest text-tech-main-dark uppercase lg:text-4xl">
              {pr.title}
            </h1>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="border border-tech-main/20 bg-tech-main/5 px-4 py-3">
                <p className="font-mono text-[0.625rem] tracking-widest text-tech-main/45 uppercase">
                  AUTHOR
                </p>
                <p className="mt-1 font-mono text-sm tracking-widest text-tech-main uppercase">
                  {linkedDraft?.author?.name || pr.user?.login || "UNKNOWN_USER"}
                </p>
              </div>
              <div className="border border-tech-main/20 bg-tech-main/5 px-4 py-3">
                <p className="font-mono text-[0.625rem] tracking-widest text-tech-main/45 uppercase">
                  TARGET
                </p>
                <p className="mt-1 font-mono text-sm tracking-widest text-tech-main uppercase">
                  {targetFileLabel}
                </p>
              </div>
              <div className="border border-tech-main/20 bg-tech-main/5 px-4 py-3">
                <p className="font-mono text-[0.625rem] tracking-widest text-tech-main/45 uppercase">
                  STATS
                </p>
                <p className="mt-1 font-mono text-sm tracking-widest text-tech-main uppercase">
                  {pr.commits} COMMITS / {pr.changed_files} FILES
                </p>
              </div>
              <div className="border border-tech-main/20 bg-tech-main/5 px-4 py-3">
                <p className="font-mono text-[0.625rem] tracking-widest text-tech-main/45 uppercase">
                  DIFF
                </p>
                <p className="mt-1 font-mono text-sm tracking-widest uppercase">
                  <span className="text-green-700">+{pr.additions}</span>
                  <span className="px-2 text-tech-main/30">/</span>
                  <span className="text-red-600">-{pr.deletions}</span>
                </p>
              </div>
            </div>
          </div>

          <a
            href={pr.html_url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs tracking-widest text-tech-main uppercase underline underline-offset-4 hover:text-tech-main-dark">
            OPEN_ON_GITHUB_
          </a>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          {linkedDraft ? (
            <ReviewEditor
              pr={{
                number: pr.number,
                title: pr.title,
                htmlUrl: pr.html_url,
                baseRef: pr.base.ref,
                headRef: pr.head.ref,
                commits: pr.commits,
                changedFiles: pr.changed_files,
                additions: pr.additions,
                deletions: pr.deletions,
                authorLogin: pr.user?.login || "UNKNOWN",
              }}
              files={reviewFiles}
              initialActiveFileId={linkedDraftFiles?.activeFileId}
              modeAnalysis={modeAnalysis}
              mergeStrategyAnalysis={mergeStrategyAnalysis}
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
            <div className="border border-tech-main/30 bg-tech-main/5 px-6 py-10 font-mono text-sm tracking-widest text-tech-main/70 uppercase">
              NO_DRAFT_LINKED_
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <PRActionButtons
            closePRAction={async () => {
              "use server"
              await closePRAction(prNumber)
            }}
            mergePRAction={
              !mergeBlockedReason
                ? async (options) => {
                    "use server"
                    await mergePRAction(prNumber, options)
                  }
                : null
            }
            mergeStrategyAnalysis={mergeStrategyAnalysis}
            mergeBlockedReason={mergeBlockedReason}
            squashCommitDefaults={{
              title: defaultCommitTitle,
              body: defaultCommitBody,
              coauthorLines,
            }}
          />

          <div className="border border-tech-main/25 bg-tech-main/5 p-4">
            <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
              REVIEW_FLOW
            </p>
            <div className="mt-3 space-y-3 font-mono text-[0.6875rem] leading-relaxed text-tech-main/70">
              <p>Author: {linkedDraft?.author?.name || pr.user?.login || "UNKNOWN_USER"}</p>
              <p>Head branch: {pr.head.ref}</p>
              <p>Base branch: {pr.base.ref}</p>
              <p>Auto recommendation: {mergeStrategyAnalysis.recommendation.toUpperCase()}</p>
              <p>{mergeStrategyAnalysis.rationale}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
