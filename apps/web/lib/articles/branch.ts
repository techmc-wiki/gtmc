import { ARTICLES_REPO } from "@/lib/github/repos"
import {
  getFileSnapshot as getFileSnapshotShared,
  getMainBranchHeadSha as getMainBranchHeadShaShared,
  upsertFileOnBranch as upsertFileOnBranchShared,
  upsertFilesOnBranch as upsertFilesOnBranchShared,
  type BranchFileEntry,
} from "@/lib/github/branch"

export type { BranchFileEntry }

export async function getMainBranchHeadSha(token?: string) {
  return getMainBranchHeadShaShared(token, ARTICLES_REPO)
}

export async function resolveArticleFilePath(
  filePath: string,
  refs: string[],
  token?: string
) {
  const normalizedPath = filePath.replace(/^\/+/, "")
  const withoutExtension = normalizedPath.replace(/\.md$/i, "")
  const candidates = normalizedPath.endsWith(".md")
    ? [normalizedPath, withoutExtension, `${withoutExtension}/README.md`]
    : [
        normalizedPath,
        `${withoutExtension}.md`,
        `${withoutExtension}/README.md`,
      ]

  for (const ref of refs) {
    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop -- sequential: returns on first match found
      const snapshot = await getFileSnapshotShared(candidate, ref, token, ARTICLES_REPO)
      if (snapshot) {
        return candidate
      }
    }
  }

  return normalizedPath.endsWith(".md")
    ? normalizedPath
    : `${withoutExtension}.md`
}

export async function upsertFileOnBranch({
  authorEmail,
  authorName,
  branchName,
  content,
  filePath,
  message,
  token,
}: {
  authorEmail: string
  authorName: string
  branchName: string
  content: string
  filePath: string
  message: string
  token?: string
}) {
  return upsertFileOnBranchShared({
    authorEmail,
    authorName,
    branchName,
    content,
    filePath,
    message,
    token,
    repo: ARTICLES_REPO,
  })
}

export async function upsertFilesOnBranch(
  token: string | undefined,
  entries: BranchFileEntry[],
  branchName: string,
  author?: { name: string; email: string }
): Promise<void> {
  return upsertFilesOnBranchShared(
    token,
    entries,
    branchName,
    ARTICLES_REPO,
    author
  )
}
