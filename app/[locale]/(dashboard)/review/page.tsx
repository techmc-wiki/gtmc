import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ClosedPRList } from "./closed-pr-list"
import { TechCard } from "@/components/ui/tech-card"
import { TechButton } from "@/components/ui/tech-button"
import { Link } from "@/i18n/navigation"
import { getClosedPRs, getOpenPRs, getPR } from "@/lib/github/pr-manager"
import {
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github/articles-repo"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Review Hub",
  description: "Admin content review and approval dashboard.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"
export const revalidate = 0

type PR = Awaited<ReturnType<typeof getOpenPRs>>[number]

type PRWithConflictMode = PR & {
  conflictMode?: string | null
}

export type ClosedPRListItem = {
  id: number
  number: number
  title: string | null
  createdAt: string
  userLogin: string | null
  headRef: string
  isMerged: boolean
}

export async function getClosedPRsAction(
  page: number
): Promise<ClosedPRListItem[]> {
  "use server"

  const token = process.env.GITHUB_ARTICLES_WRITE_PAT

  try {
    const closedPRs = await getClosedPRs(token, page, 10)

    return closedPRs.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      createdAt: pr.created_at,
      userLogin: pr.user?.login ?? null,
      headRef: pr.head.ref,
      isMerged: Boolean(pr.merged_at),
    }))
  } catch (error) {
    console.error("Failed to fetch closed PRs:", error)
    throw new Error("Unable to load closed and merged pull requests.")
  }
}

async function analyzePRConflictStatus(prNumber: number, token?: string) {
  const prDetail = await getPR(prNumber, token)
  let isConflict = false
  if (prDetail.mergeable === false) {
    isConflict = true
  } else {
    const octokit = getOctokit(token)
    try {
      const { data: files } = await octokit.pulls.listFiles({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        pull_number: prNumber,
      })
      for (const f of files) {
        if (f.patch && f.patch.includes("<<<<<<< ")) {
          isConflict = true
          break
        } else if (
          !f.patch &&
          (f.filename.endsWith(".md") || f.filename.endsWith(".mdx"))
        ) {
          try {
            const { data: contentData } = await octokit.repos.getContent({
              owner: ARTICLES_REPO_OWNER,
              repo: ARTICLES_REPO_NAME,
              path: f.filename,
              ref: prDetail.head.sha,
            })
            if (
              !Array.isArray(contentData) &&
              contentData.type === "file" &&
              contentData.content
            ) {
              const decoded = Buffer.from(
                contentData.content,
                "base64"
              ).toString("utf-8")
              if (decoded.includes("<<<<<<< ")) {
                isConflict = true
                break
              }
            }
          } catch (e) {
            console.error("Failed to fetch file content for conflict check:", e)
          }
        }
      }
    } catch (error) {
      console.error("[review/page] PR conflict analysis failed:", error)
    }
  }
  return isConflict
}

export default async function ReviewHubPage() {
  const t = await getTranslations("Review")
  const session = await auth()
  let isAdmin = false

  if (session?.user?.id) {
    try {
      const ctx = await getCurrentUserAuthContext(session.user.id)
      isAdmin = ctx.role === "ADMIN"
    } catch (error) {
      console.error("[review/hub] admin context failed:", error)
      isAdmin = false
    }
  }

  if (!session?.user || !isAdmin) {
    return (
      <div className="mx-auto mt-20 max-w-6xl p-8 text-center">
        <h1 className="text-6xl font-black text-red-500 uppercase">
          {t("accessDenied")}
        </h1>
        <p className="mt-4 text-xl font-bold">{t("adminRequired")}</p>
        <Link href="/">
          <TechButton variant="primary" className="mt-8">
            {t("returnToBase")}
          </TechButton>
        </Link>
      </div>
    )
  }

  const token = process.env.GITHUB_ARTICLES_WRITE_PAT
  let openPRs: PR[] = []
  const groupedPRs = {
    conflicts: [] as PRWithConflictMode[],
    pending: [] as PRWithConflictMode[],
  }

  try {
    openPRs = await getOpenPRs(token)

    // Fetch conflictMode for each PR from Revisions
    const prNumbers = openPRs.map((pr) => pr.number)
    const revisions = await prisma.revision.findMany({
      where: { githubPrNum: { in: prNumbers } },
      select: { githubPrNum: true, conflictMode: true },
    })

    const conflictModeMap = new Map(
      revisions.map((r) => [r.githubPrNum, r.conflictMode])
    )

    const analysisResults = await Promise.all(
      openPRs.map(async (pr) => {
        const isConflict = await analyzePRConflictStatus(pr.number, token)
        const conflictMode = conflictModeMap.get(pr.number)
        return { pr: { ...pr, conflictMode } as PRWithConflictMode, isConflict }
      })
    )

    for (const result of analysisResults) {
      if (result.isConflict) {
        groupedPRs.conflicts.push(result.pr)
      } else {
        groupedPRs.pending.push(result.pr)
      }
    }
  } catch (error) {
    console.error("Failed to fetch PRs:", error)
  }

  const renderPRCard = (pr: PRWithConflictMode, isConflict: boolean) => (
    <TechCard
      key={pr.id}
      className={`
        group relative flex flex-col items-start justify-between space-y-4
        border border-tech-main/40
        ${isConflict ? `border-red-500/50 bg-red-500/10` : `bg-white/80`}
        p-6 backdrop-blur-sm
        md:flex-row md:items-center md:space-y-0
      `}>
      <CornerBrackets variant="hover" />

      <div className="relative z-10 flex-1">
        <div className="mb-3 flex items-center gap-3">
          <span
            className={`
              border px-2 py-0.5 font-mono text-xs tracking-wider
              ${
                isConflict
                  ? `border-red-500/40 bg-red-500/20 text-red-600`
                  : `border-blue-500/40 bg-blue-500/10 text-blue-600`
              }
            `}>
            [PR #{pr.number}]
          </span>
          <span className="mono-label">
            {new Date(pr.created_at).toLocaleString()}
          </span>
          {isConflict && (
            <span
              className="
                animate-pulse bg-red-500 px-2 py-0.5 text-xs font-bold
                text-white
              ">
              {t("unresolvedConflicts")}
            </span>
          )}
          {pr.conflictMode && (
            <span
              className={`
                border px-2 py-0.5 font-mono text-[0.6875rem] tracking-widest uppercase
                ${
                  pr.conflictMode === "FINE_GRAINED"
                    ? `border-blue-500/30 bg-blue-500/10 text-blue-700`
                    : `border-tech-main/30 bg-tech-main/10 text-tech-main`
                }
              `}>
              {pr.conflictMode === "FINE_GRAINED"
                ? t("modeFineGrained")
                : pr.conflictMode}
            </span>
          )}
        </div>
        <h3
          className={`
            mb-2 border-l-2 border-tech-main/40 pl-3 text-lg font-bold
            tracking-tight uppercase
            md:text-xl
            ${isConflict ? `text-red-700` : `text-tech-main-dark`}
          `}>
          {pr.title || t("untitled")}
        </h3>
        <p className="mb-3 pl-3 font-mono text-xs text-tech-main/80">
          {t("submittedBy")}{" "}
          <span className="font-bold text-tech-main-dark">
            {pr.user?.login || t("unknown")}
          </span>
        </p>
        <p
          className="
            ml-3 inline-flex items-center border guide-line bg-tech-main/5 px-2
            py-1 font-mono text-xs text-tech-main
          ">
          <span className="mr-2 size-1.5 bg-tech-main"></span> {t("target")}{" "}
          {pr.head.ref}
        </p>
      </div>

      <div
        className="
          relative z-10 flex w-full flex-col gap-4
          md:w-auto md:flex-row
        ">
        <Link
          href={`/review/${pr.number}`}
          className="
            w-full
            md:w-auto
          ">
          <TechButton
            variant={isConflict ? "danger" : "primary"}
            className="
              flex min-h-11 w-full items-center justify-center px-6 text-xs
              tracking-widest uppercase transition-transform
              hover:scale-[1.02]
              md:w-auto
            ">
            {t("resolveButton")} →
          </TechButton>
        </Link>
      </div>
    </TechCard>
  )

  return (
    <div className="page-container">
      <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />

      <div className="grid grid-cols-1 gap-6">
        {openPRs.length === 0 ? (
          <EmptyState message={t("listEmpty")} />
        ) : (
          <div className="flex flex-col gap-10">
            {groupedPRs.conflicts.length > 0 && (
              <div className="space-y-4">
                <h2
                  className="
                    border-b-2 border-red-500/50 pb-2 font-bold tracking-widest
                    text-red-600 uppercase
                  ">
                  {t("priorityConflicts")}
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  {groupedPRs.conflicts.map((pr) => renderPRCard(pr, true))}
                </div>
              </div>
            )}

            {groupedPRs.pending.length > 0 && (
              <div className="space-y-4">
                <h2
                  className="
                    border-b-2 border-tech-main/50 pb-2 font-bold
                    tracking-widest text-tech-main uppercase
                  ">
                  {t("pendingReviews")}
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  {groupedPRs.pending.map((pr) => renderPRCard(pr, false))}
                </div>
              </div>
            )}
          </div>
        )}

        <ClosedPRList getClosedPRsAction={getClosedPRsAction} />
      </div>
    </div>
  )
}
