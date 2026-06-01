"use server"

import { revalidatePath } from "next/cache"

import { requireAuth } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import {
  parseGlossaryCsv,
  serializeGlossaryCsv,
  type GlossaryRow,
} from "@/lib/glossary/csv"
import { openGlossaryPullRequest } from "@/lib/glossary/pr"
import { GLOSSARY_REPO, getGlossaryWriteToken } from "@/lib/github/repos"
import { getFileSnapshot } from "@/lib/github/branch"
import { GLOSSARY_CSV_PATH, GLOSSARY_MAIN_BRANCH } from "@/lib/glossary/repo"
import { generateSlug } from "@/lib/glossary/slug"

interface GlossaryOperation {
  kind: "edit" | "add" | "delete"
  slug: string
  before?: GlossaryRow
  after?: GlossaryRow
}

export async function submitGlossaryDraftAction(
  id: string,
  opts?: { useRealEmail?: boolean }
): Promise<{ prUrl: string; prNumber: number }> {
  const session = await requireAuth()

  const draft = await prisma.glossaryRevision.findUnique({
    where: { id },
  })

  if (!draft) {
    throw new Error("Draft not found")
  }

  if (draft.authorId !== session.user.id) {
    throw new Error("Unauthorized")
  }

  if (draft.status !== "DRAFT") {
    throw new Error("Only a draft can be submitted")
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

    throw new Error(
      current?.status === "PENDING"
        ? "Submit already in progress"
        : "Only a draft can be submitted"
    )
  }

  try {
    const githubLogin = session.user.githubLogin
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
      select: { providerAccountId: true },
    })

    let authorEmail: string
    if (githubLogin && account?.providerAccountId) {
      authorEmail = `${account.providerAccountId}+${githubLogin}@users.noreply.github.com`
    } else if (opts?.useRealEmail && session.user.email) {
      authorEmail = session.user.email
    } else if (session.user.email) {
      authorEmail = session.user.email
    } else {
      authorEmail = "glossary-bot@gtmc.dev"
    }

    const authorName = session.user.name || "GTMC Glossary Contributor"

    const snapshot = await getFileSnapshot(
      GLOSSARY_CSV_PATH,
      GLOSSARY_MAIN_BRANCH,
      undefined,
      GLOSSARY_REPO
    )

    if (!snapshot) {
      throw new Error("Failed to fetch upstream glossary CSV")
    }

    const parsed = parseGlossaryCsv(snapshot.content)
    let rows = parsed.rows

    const operations = draft.operations as unknown as GlossaryOperation[]

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

    let body = `This PR updates glossary terms via [GTMC](https://beta.techmc.wiki).\n\n`
    body += `Changes: ${editCount} edited, ${addCount} added, ${deleteCount} deleted.\n`
    if (githubLogin) {
      body += `Requested by @${githubLogin}.\n`
    }
    body += `Authored by ${authorName}.\n\n`
    body += `---\n`
    body += `This PR was created automatically from the GTMC glossary editor. Further edits cannot be pushed to this PR via the website. Please discuss changes in the PR comments or submit a new draft.`

    const token = getGlossaryWriteToken()
    const branchName = `glossary-update-${id.slice(0, 8)}`

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

    revalidatePath("/draft")
    revalidatePath("/glossary")

    return { prUrl: result.prUrl, prNumber: result.prNumber }
  } catch (error) {
    await prisma.glossaryRevision.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "DRAFT" },
    })
    throw error
  }
}
