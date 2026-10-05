"use server"

import { createHash } from "node:crypto"
import path from "node:path"
import { revalidatePath } from "next/cache"
import { getMainBranchHeadSha } from "@/lib/articles/branch"
import { openDraftPullRequest } from "@/lib/articles/pr"
import { getAuthorIdentity, requireAuth } from "@/lib/auth/context"
import { getDuplicateDraftFilePaths } from "@/lib/drafts/files"
import { parseImageRefs, rewriteImageUrls } from "@/lib/drafts/markdown"
import {
  deleteDraftAssets,
  downloadDraftAsset,
  draftAssetPrefix,
} from "@/lib/drafts/storage"
import { readDraft, requireDraftVersion, writeDraft } from "@/lib/drafts/store"
import { lockSubmission } from "@/lib/drafts/submission"
import { getGitHubWriteToken } from "@/lib/github/articles-repo"

const UPLOAD_PLACEHOLDER_RE = /<!--\s*UPLOAD_PENDING_[a-f0-9-]+\s*-->/i

export async function submitDraftAction(revisionId: string, etag: string) {
  const session = await requireAuth()
  const record = await readDraft(session.user.id, revisionId)
  if (!record || record.draft.kind !== "article") {
    throw new Error("Draft not found")
  }
  const existing = record.draft
  if (existing.status === "SUBMITTED" && existing.githubPrNum) {
    return { success: true, status: existing.status }
  }
  if (existing.status === "DRAFT") requireDraftVersion(record.etag, etag)
  if (existing.files.some((file) => !file.filePath)) {
    throw new Error("Every file requires a file path before opening a PR")
  }
  const duplicates = getDuplicateDraftFilePaths(existing.files)
  if (duplicates.length) {
    throw new Error(`Duplicate file paths: ${duplicates.join(", ")}`)
  }
  if (existing.files.some((file) => UPLOAD_PLACEHOLDER_RE.test(file.content))) {
    throw new Error("Finish image uploads before opening a PR")
  }
  const token = getGitHubWriteToken()
  if (!token) {
    throw new Error("GitHub write access is not configured (GITHUB_TOKEN)")
  }
  const identity = await getAuthorIdentity(session)
  const prefix = draftAssetPrefix(session.user.id, revisionId)
  const refsByFile = existing.files.map((file) =>
    parseImageRefs(file.content, "draft-assets")
  )
  const paths = new Set(refsByFile.flat().map((ref) => ref.storagePath))
  const assets = await Promise.all(
    [...paths].map(async (storagePath) => {
      if (!storagePath.startsWith(prefix)) {
        throw new Error("An image belongs to another draft")
      }
      const content = await downloadDraftAsset(storagePath)
      return {
        id: storagePath,
        storagePath,
        filename: storagePath
          .slice(prefix.length)
          .replace(/^[a-f0-9-]{36}-/, ""),
        contentHash: createHash("sha256").update(content).digest("hex"),
        content,
      }
    })
  )
  const targetsByPath = new Map<string, string>()
  const files = existing.files.map((file, index) => {
    for (const ref of refsByFile[index]) {
      if (targetsByPath.has(ref.storagePath)) continue
      const asset = assets.find(
        (candidate) => candidate.storagePath === ref.storagePath
      )!
      const ext = path.posix.extname(asset.filename)
      const stem = asset.filename.slice(0, asset.filename.length - ext.length)
      targetsByPath.set(
        asset.storagePath,
        path.posix.join(
          path.posix.dirname(file.filePath),
          "img",
          `${stem}-${asset.contentHash.slice(0, 12)}${ext}`
        )
      )
    }
    const replacements = new Map(
      refsByFile[index].map((ref) => [
        ref.url,
        targetsByPath.get(ref.storagePath)!,
      ])
    )
    return {
      ...file,
      content: rewriteImageUrls(file.content, replacements),
    }
  })
  const imageEntries = [
    ...new Map(
      assets.map((asset) => [
        targetsByPath.get(asset.storagePath)!,
        { path: targetsByPath.get(asset.storagePath)!, content: asset.content },
      ])
    ).values(),
  ]
  const baseMainSha =
    existing.baseMainSha || (await getMainBranchHeadSha(token))
  const locked = await lockSubmission(existing, record.etag)
  const result = await openDraftPullRequest({
    activeFileId: existing.activeFileId,
    branchName: locked.draft.branchName!,
    recoverOnly: locked.recoverOnly,
    authorName: identity.name,
    authorEmail: identity.email,
    files,
    imageEntries,
    title: existing.title,
    baseMainSha,
    token,
  })
  const now = new Date().toISOString()
  await writeDraft(
    {
      ...existing,
      activeFileId: result.activeFileId,
      files: result.files,
      baseMainSha,
      branchName: locked.draft.branchName,
      status: "SUBMITTED",
      githubPrNum: result.prNumber,
      githubPrUrl: result.prUrl,
      submittedAt: now,
      updatedAt: now,
    },
    locked.etag
  )
  try {
    await deleteDraftAssets(session.user.id, revisionId)
  } catch (error) {
    console.error("Submitted draft asset cleanup failed:", error)
  }
  revalidatePath("/draft")
  return { success: true, status: "SUBMITTED" }
}
