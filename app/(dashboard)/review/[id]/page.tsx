import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import Link from "next/link"
import { BrutalButton } from "@/components/ui/brutal-button"
import { getMarkdownComponents } from "@/lib/markdown"
import {
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github-pr"
import { mergePRAction, closePRAction } from "@/actions/review"
import ConflictResolver from "./components/conflict-resolver"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/")
  }

  const { id } = await params
  const prNumber = parseInt(id, 10)
  if (isNaN(prNumber)) {
    notFound()
  }

  const token = process.env.GITHUB_ARTICLES_WRITE_PAT
  const octokit = getOctokit(token)

  let pr
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

  let isMergeable = pr.mergeable === true && pr.state === "open"
  let hasConflict = pr.mergeable === false && pr.state === "open"

  let rawContent = ""
  if (mainFile) {
    // 1. Fetch current PR head file to check if it has unresolved conflict markers left behind
    let currentPrText = ""
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: mainFile.filename,
        ref: pr.head.ref,
      })
      if (!Array.isArray(fileData) && fileData.type === "file") {
        currentPrText = Buffer.from(fileData.content, "base64").toString("utf8")
        if (
          currentPrText.includes("<<<<<<< Current Change") &&
          pr.state === "open"
        ) {
          // It has leftover literal conflict markers, we MUST treat it as a conflict
          // even if GitHub says it's technically mergeable based on tree history!
          hasConflict = true
          isMergeable = false
          rawContent = currentPrText
        }
      }
    } catch (e) {
      console.error(e)
    }

    if (hasConflict) {
      if (rawContent && rawContent.includes("<<<<<<< Current Change")) {
        // We already have the completely formatted conflict text!
        // No need to run diff3Merge again.
      } else {
        try {
          const { data: mainRef } = await octokit.git.getRef({
            owner,
            repo,
            ref: "heads/main",
          })
          const mainSha = mainRef.object.sha
          const prHeadSha = pr.head.sha

          const { data: compare } = await octokit.repos.compareCommits({
            owner,
            repo,
            base: mainSha,
            head: prHeadSha,
          })
          const ancestorSha = compare.merge_base_commit.sha

          const fetchFileRaw = async (refStr: string) => {
            try {
              const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: mainFile.filename,
                ref: refStr,
              })
              if (!Array.isArray(data) && data.type === "file") {
                return Buffer.from(data.content, "base64").toString("utf8")
              }
            } catch {
              return ""
            }
            return ""
          }

          const [mainText, ancestorText, prText] = await Promise.all([
            fetchFileRaw(mainSha),
            fetchFileRaw(ancestorSha),
            fetchFileRaw(prHeadSha),
          ])

          const { diff3Merge } = await import("node-diff3")
          const merged = diff3Merge(
            mainText.split(/\r?\n/),
            ancestorText.split(/\r?\n/),
            prText.split(/\r?\n/)
          )
          const output: string[] = []
          for (const block of merged) {
            if (block.ok) {
              output.push(...block.ok)
            } else if (block.conflict) {
              output.push(`<<<<<<< Current Change (main)`)
              output.push(...block.conflict.a)
              output.push("=======")
              output.push(...block.conflict.b)
              output.push(`>>>>>>> Incoming Change (PR)`)
            }
          }
          rawContent = output.join("\n")
        } catch (e) {
          console.error("Three-way merge failed, falling back to PR text", e)
          if (!rawContent) rawContent = currentPrText
        }
      }
    } else {
      if (!rawContent) rawContent = currentPrText
    }
  }

  return (
    <div
      className="
        mx-auto max-w-6xl space-y-8 p-4 pb-32
        md:p-8
      ">
      <Link href="/review">
        <BrutalButton variant="ghost" size="sm">
          {"<"} BACK_TO_HUB
        </BrutalButton>
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
            <span>{mainFile?.filename || "UNKNOWN"}</span>
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
          <div
            className="
              flex w-full gap-4
              md:w-auto
            ">
            <form
              action={async () => {
                "use server"
                await closePRAction(prNumber)
              }}>
              <BrutalButton
                type="submit"
                variant="secondary"
                className="
                  w-full border-red-600 text-red-600
                  hover:bg-red-600 hover:text-white
                ">
                CLOSE
              </BrutalButton>
            </form>
            {isMergeable && (
              <form
                action={async () => {
                  "use server"
                  await mergePRAction(prNumber)
                }}>
                <BrutalButton
                  type="submit"
                  variant="primary"
                  className="w-full">
                  APPROVE_&_MERGE
                </BrutalButton>
              </form>
            )}
          </div>
        )}
      </div>

      {hasConflict ? (
        <ConflictResolver
          prNumber={prNumber}
          filePath={mainFile?.filename || ""}
          initialContent={rawContent}
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
                prose w-full max-w-none overflow-hidden wrap-break-word
                text-tech-main-dark prose-tech
                selection:bg-tech-main/20 selection:text-tech-main-dark
              ">
              {rawContent ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={getMarkdownComponents(mainFile?.filename || "")}>
                  {rawContent}
                </ReactMarkdown>
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
