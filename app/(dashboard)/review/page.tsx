/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrutalCard } from "@/components/ui/brutal-card"
import { BrutalButton } from "@/components/ui/brutal-button"
import Link from "next/link"
import {
  getOpenPRs,
  getPR,
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github-pr"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

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
    } catch {}
  }
  return isConflict
}

export default async function ReviewHubPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="mx-auto mt-20 max-w-6xl p-8 text-center">
        <h1 className="text-6xl font-black text-red-500 uppercase">
          ACCESS DENIED
        </h1>
        <p className="mt-4 text-xl font-bold">ADMIN CLEARANCE REQUIRED.</p>
        <Link href="/">
          <BrutalButton variant="primary" className="mt-8">
            RETURN TO BASE
          </BrutalButton>
        </Link>
      </div>
    )
  }

  const token = process.env.GITHUB_ARTICLES_WRITE_PAT
  let openPRs: Array<any> = []
  const groupedPRs = {
    conflicts: [] as any[],
    pending: [] as any[],
  }

  try {
    openPRs = (await getOpenPRs(token)) as any[]

    const analysisResults = await Promise.all(
      openPRs.map(async (pr) => {
        const isConflict = await analyzePRConflictStatus(pr.number, token)
        return { pr, isConflict }
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

  const renderPRCard = (pr: any, isConflict: boolean) => (
    <BrutalCard
      key={pr.id}
      className={`
        group relative flex flex-col items-start justify-between space-y-4
        border border-tech-main/40
        ${isConflict ? `border-red-500/50 bg-red-500/10` : `bg-white/80`}
        p-6 backdrop-blur-sm
        md:flex-row md:items-center md:space-y-0
      `}>
      <div
        className="
          absolute top-0 left-0 size-2 -translate-px border-t-2 border-l-2
          border-tech-main/40 opacity-0 transition-opacity
          group-hover:opacity-100
        "></div>
      <div
        className="
          absolute right-0 bottom-0 size-2 translate-px border-r-2 border-b-2
          border-tech-main/40 opacity-0 transition-opacity
          group-hover:opacity-100
        "></div>

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
          <span className="font-mono text-xs text-tech-main/50">
            {new Date(pr.created_at).toLocaleString()}
          </span>
          {isConflict && (
            <span
              className="
                animate-pulse bg-red-500 px-2 py-0.5 text-xs font-bold
                text-white
              ">
              UNRESOLVED CONFLICTS
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
          {pr.title || "UNTITLED"}
        </h3>
        <p className="mb-3 pl-3 font-mono text-xs text-tech-main/80">
          Submitted by:{" "}
          <span className="font-bold text-tech-main-dark">
            {pr.user?.login || "UNKNOWN"}
          </span>
        </p>
        <p
          className="
            ml-3 inline-flex items-center border guide-line bg-tech-main/5 px-2
            py-1 font-mono text-xs text-tech-main
          ">
          <span className="mr-2 size-1.5 bg-tech-main"></span> TARGET:{" "}
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
          <BrutalButton
            variant={isConflict ? "danger" : "primary"}
            className="
              flex min-h-11 w-full items-center justify-center px-6 text-xs
              tracking-widest uppercase transition-transform
              hover:scale-[1.02]
              md:w-auto
            ">
            {isConflict ? "RESOLVE CONFLICT \u2192" : "REVIEW CONTENT \u2192"}
          </BrutalButton>
        </Link>
      </div>
    </BrutalCard>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6">
      <div className="relative border-b border-tech-main/40 pb-6">
        <div
          className="
            absolute top-0 right-0 size-8 translate-x-px -translate-y-px
            border-t border-r guide-line
          "></div>
        <h1
          className="
            flex items-center text-2xl font-bold tracking-tight
            text-tech-main-dark uppercase
            md:text-4xl
          ">
          <span
            className="mr-4 size-4 border border-tech-main/40 bg-tech-main/20"></span>
          REVIEW HUB
        </h1>
        <p
          className="
            mt-3 flex items-center font-mono text-xs tracking-widest
            text-tech-main/80
            sm:text-sm
          ">
          <span className="mr-2 size-2 animate-pulse rounded-full bg-tech-main"></span>
          APPROVE CONTENT. MERGE REBELLION.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {openPRs.length === 0 ? (
          <div
            className="
              group relative border border-dashed border-tech-main/40
              bg-white/30 py-16 text-center backdrop-blur-sm
            ">
            <div
              className="
                absolute inset-0
                bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(96,112,143,0.05)_10px,rgba(96,112,143,0.05)_20px)]
              "></div>
            <h2
              className="
                relative z-10 font-mono text-lg tracking-widest
                text-tech-main/50 uppercase
              ">
              NO PENDING REVIEWS. SILENCE IN THE COMM.
            </h2>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {groupedPRs.conflicts.length > 0 && (
              <div className="space-y-4">
                <h2
                  className="
                    border-b-2 border-red-500/50 pb-2 font-bold tracking-widest
                    text-red-600 uppercase
                  ">
                  PRIORITY: RESOLVE CONFLICTS
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
                  PENDING REVIEWS
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  {groupedPRs.pending.map((pr) => renderPRCard(pr, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
