import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import {
  getDuplicateDraftFilePaths,
  normalizeDraftFileCollection,
  type DraftFileRecord,
} from "@/lib/drafts/files"
import {
  getMainBranchHeadSha,
  resolveArticleFilePath,
  upsertFileOnBranch,
  upsertFilesOnBranch,
  type BranchFileEntry,
} from "@/lib/articles/branch"
const MAIN_BRANCH = "main"

interface DraftSubmissionInput {
  activeFileId?: string
  draftId: string
  title: string
  files: DraftFileRecord[]
  imageEntries?: BranchFileEntry[]
  baseMainSha: string
  authorName: string
  authorEmail: string
  token?: string
}

export async function openDraftPullRequest({
  activeFileId,
  draftId,
  title,
  files,
  imageEntries,
  baseMainSha,
  authorName,
  authorEmail,
  token,
}: DraftSubmissionInput) {
  const octokit = getOctokit(token)
  const latestMainSha = await getMainBranchHeadSha(token)
  const resolvedDraftFiles = await Promise.all(
    files.map(async (file) => ({
      ...file,
      filePath: await resolveArticleFilePath(
        file.filePath,
        [baseMainSha, latestMainSha],
        token
      ),
    }))
  )
  const normalizedFiles = normalizeDraftFileCollection({
    activeFileId,
    files: resolvedDraftFiles,
  })
  const duplicateResolvedPaths = getDuplicateDraftFilePaths(
    normalizedFiles.files
  )
  if (duplicateResolvedPaths.length > 0) {
    throw new Error(
      `Duplicate resolved file paths are not allowed: ${duplicateResolvedPaths.join(", ")}`
    )
  }
  const branchName = buildBranchName(draftId)

  await octokit.git.createRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: baseMainSha,
  })

  if (normalizedFiles.files.length === 1) {
    const file = normalizedFiles.files[0]
    await upsertFileOnBranch({
      authorEmail,
      authorName,
      branchName,
      content: file.content,
      filePath: file.filePath,
      message: `docs: ${title}`,
      token,
    })
  } else if (normalizedFiles.files.length > 1) {
    await upsertFilesOnBranch(
      token,
      normalizedFiles.files.map((file) => ({
        path: file.filePath,
        content: file.content,
      })),
      branchName,
      { name: authorName, email: authorEmail }
    )
  }

  if (imageEntries && imageEntries.length > 0) {
    await upsertFilesOnBranch(token, imageEntries, branchName)
  }

  const { data: pr } = await octokit.pulls.create({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    title,
    head: branchName,
    base: MAIN_BRANCH,
    body: `由 ${authorName} 提交审核。`,
  })

  return {
    activeFileId: normalizedFiles.activeFileId,
    files: normalizedFiles.files,
    prNumber: pr.number,
    prUrl: pr.html_url,
  }
}

export async function getArticlePullRequest(prNumber: number, token?: string) {
  const { data } = await getOctokit(token).pulls.get({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
  })
  return data
}

function buildBranchName(draftId: string) {
  return `submission-${draftId}-${Date.now()}`.replaceAll(/[^a-zA-Z0-9/_-]/g, "-")
}
