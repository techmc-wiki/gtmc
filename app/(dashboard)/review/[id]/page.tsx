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
  getGitHubWriteToken,
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "@/lib/github-pr"
import { mergePRAction, closePRAction } from "@/actions/review"
import { prisma } from "@/lib/prisma"
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

  const token = getGitHubWriteToken(
    (session.user as { githubPat?: string }).githubPat
  )
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
  const linkedDraft = await prisma.revision.findFirst({
    where: { githubPrNum: prNumber },
  })

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
  const hasConflict = pr.mergeable === false

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
            {isMergeable && linkedDraft?.status !== "SYNC_CONFLICT" && (
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

      {hasConflict || linkedDraft?.status === "SYNC_CONFLICT" ? (
        <ConflictResolver
          prNumber={prNumber}
          filePath={mainFile?.filename || linkedDraft?.filePath || ""}
          initialContent={linkedDraft?.conflictContent || rawContent}
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
                w-full max-w-none overflow-hidden wrap-break-word
                text-tech-main-dark
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
