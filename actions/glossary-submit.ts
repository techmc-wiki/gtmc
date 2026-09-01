"use server"

import { revalidatePath } from "next/cache"

import { requireAuth } from "@/lib/auth/context"
import { prisma } from "@/lib/prisma"
import {
  parseGlossaryCsv,
  serializeGlossaryCsv,
  type GlossaryRow,
} from "@/lib/glossary/csv"
import { openGlossaryPullRequest } from "@/lib/glossary/pr"
import { getFileSnapshot } from "@/lib/github/branch"
import { generateSlug } from "@/lib/glossary/slug"
import { GLOSSARY_FORK_REPO, GLOSSARY_REPO } from "@/lib/github/repos"
import { resolveGithubToken } from "@/lib/github/tokens"

const GLOSSARY_MAIN_BRANCH = "main"
const GLOSSARY_CSV_PATH = "TechMC Glossary.csv"

interface GlossaryOperation {
  kind: "edit" | "add" | "delete"
  slug: string
  before?: GlossaryRow
  after?: GlossaryRow
}

export type SubmitGlossaryResult =
  | { success: true; prUrl: string; prNumber: number }
  | { success: false; error: string }

export async function submitGlossaryDraftAction(
  id: string,
  opts?: { useRealEmail?: boolean }
): Promise<SubmitGlossaryResult> {
  try {
    const session = await requireAuth()

    const draft = await prisma.glossaryRevision.findUnique({
      where: { id },
    })

    if (!draft) {
      return { success: false, error: "Draft not found" }
    }

    if (draft.authorId !== session.user.id) {
      return { success: false, error: "Unauthorized" }
    }

    if (draft.status !== "DRAFT") {
      return {
        success: false,
        error:
          draft.status === "SUBMITTED"
            ? "This draft has already been submitted."
            : "Only a draft can be submitted.",
      }
    }

    const operations = (draft.operations ??
      []) as unknown as GlossaryOperation[]
    if (operations.length === 0) {
      return {
        success: false,
        error:
          "Cannot submit an empty draft. Please add at least one edit operation.",
      }
    }

    const token = resolveGithubToken()

    if (!token) {
      return {
        success: false,
        error:
          "GitHub glossary write token is not configured on the server (missing GITHUB_TOKEN).",
      }
    }

    const locked = await prisma.glossaryRevision.updateMany({
      where: { id, authorId: session.user.id, status: "DRAFT" },
      data: { status: "PENDING" },
    })

    if (locked.count === 0) {
      const current = await prisma.glossaryRevision.findUnique({
        where: { id },
        select: { status: true },
      })

      return {
        success: false,
        error:
          current?.status === "PENDING"
            ? "Submit already in progress for this draft."
            : "Only a draft can be submitted.",
      }
    }

    try {
      const githubLogin = session.user.githubLogin
      const account = await prisma.account.findFirst({
        where: { userId: session.user.id, provider: "github" },
        select: { providerAccountId: true },
      })

      let authorEmail: string
      if (githubLogin && account?.providerAccountId && !opts?.useRealEmail) {
        authorEmail = `${account.providerAccountId}+${githubLogin}@users.noreply.github.com`
      } else if (session.user.email) {
        authorEmail = session.user.email
      } else {
        authorEmail = "glossary-bot@gtmc.dev"
      }

      const authorName = session.user.name || "GTMC Glossary Contributor"

      let snapshot = await getFileSnapshot(
        GLOSSARY_CSV_PATH,
        GLOSSARY_MAIN_BRANCH,
        token,
        GLOSSARY_REPO
      )

      if (!snapshot) {
        snapshot = await getFileSnapshot(
          GLOSSARY_CSV_PATH,
          GLOSSARY_MAIN_BRANCH,
          token,
          GLOSSARY_FORK_REPO
        )
      }

      if (!snapshot) {
        throw new Error(
          `Failed to fetch "${GLOSSARY_CSV_PATH}" from GitHub (${GLOSSARY_REPO.owner}/${GLOSSARY_REPO.name}).`
        )
      }

      const parsed = parseGlossaryCsv(snapshot.content)
      let rows = parsed.rows

      for (const op of operations) {
        const slugMap = new Map<string, number>()
        for (let i = 0; i < rows.length; i++) {
          const slug = generateSlug(rows[i]["Full Form (English)"])
          slugMap.set(slug, i)
        }

        if (op.kind === "edit") {
          const idx = slugMap.get(op.slug)
          if (idx !== undefined && op.after) {
            rows[idx] = op.after
          }
        } else if (op.kind === "add" && op.after) {
          rows.push(op.after)
        } else if (op.kind === "delete") {
          const idx = slugMap.get(op.slug)
          if (idx !== undefined) {
            rows.splice(idx, 1)
          }
        }
      }

      const serialized = serializeGlossaryCsv(rows, {
        headerOrder: parsed.headerOrder,
        hadBom: parsed.hadBom,
        lineEnding: parsed.lineEnding,
      })

      const editCount = operations.filter((op) => op.kind === "edit").length
      const addCount = operations.filter((op) => op.kind === "add").length
      const deleteCount = operations.filter((op) => op.kind === "delete").length

      const title =
        draft.title ||
        `Update glossary: ${editCount} edited, ${addCount} added, ${deleteCount} deleted`

      let body = `This PR updates glossary terms via [GTMC](https://techmc.wiki).\n\n`
      body += `Changes: ${editCount} edited, ${addCount} added, ${deleteCount} deleted.\n`
      if (githubLogin) {
        body += `Requested by @${githubLogin}.\n`
      }
      body += `Authored by ${authorName}.\n\n`
      body += `---\n`
      body += `This PR was created automatically from the GTMC glossary editor. Further edits cannot be pushed to this PR via the website. Please discuss changes in the PR comments or submit a new draft.`

      const branchName = `glossary-update-${id.slice(0, 8)}-${Date.now().toString(36)}`

      const result = await openGlossaryPullRequest({
        csvContent: serialized,
        title,
        body,
        branchName,
        authorName,
        authorEmail,
        token,
      })

      await prisma.glossaryRevision.update({
        where: { id },
        data: {
          status: "SUBMITTED",
          branchName: result.branchName,
          githubPrUrl: result.prUrl,
          githubPrNum: result.prNumber,
          submittedAt: new Date(),
        },
      })

      try {
        revalidatePath("/draft")
        revalidatePath("/glossary")
      } catch {
        // ignore background revalidation error
      }

      return { success: true, prUrl: result.prUrl, prNumber: result.prNumber }
    } catch (innerError) {
      await prisma.glossaryRevision.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "DRAFT" },
      })
      const message =
        innerError instanceof Error ? innerError.message : "Submission failed"
      return { success: false, error: message }
    }
  } catch (outerError) {
    const message =
      outerError instanceof Error ? outerError.message : "Submission failed"
    return { success: false, error: message }
  }
}
