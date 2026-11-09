import { ARTICLES_SOURCE_BRANCH } from "@/lib/articles/source";
import {
  getDuplicateDraftFilePaths,
  normalizeDraftFileCollection,
  type DraftFileRecord,
} from "@/lib/drafts/files";
import {
  getArticleSourceHeadSha,
  resolveArticleFilePath,
  upsertFileOnBranch,
  upsertFilesOnBranch,
  type BranchFileEntry,
} from "@/lib/articles/branch";
import { ARTICLES_REPO, getOctokit } from "@/lib/github/repos";
import { SubmissionInProgressError } from "@/lib/drafts/submission";

export interface DraftPullRequestResult {
  activeFileId: string;
  files: DraftFileRecord[];
  prNumber: number;
  prUrl: string;
}

interface DraftSubmissionInput {
  activeFileId?: string;
  branchName: string;
  recoverOnly: boolean;
  title: string;
  files: DraftFileRecord[];
  imageEntries?: BranchFileEntry[];
  baseMainSha: string;
  authorName: string;
  authorEmail: string;
  token?: string;
}

export async function findArticlePullRequestByBranch(
  branchName: string,
  token?: string
) {
  const octokit = getOctokit(token);
  const { data } = await octokit.pulls.list({
    owner: ARTICLES_REPO.owner,
    repo: ARTICLES_REPO.name,
    head: `${ARTICLES_REPO.owner}:${branchName}`,
    state: "all",
  });
  return data[0] ?? null;
}

export async function openDraftPullRequest({
  activeFileId,
  branchName,
  recoverOnly,
  title,
  files,
  imageEntries,
  baseMainSha,
  authorName,
  authorEmail,
  token,
}: DraftSubmissionInput): Promise<DraftPullRequestResult> {
  const octokit = getOctokit(token);
  const latestMainSha = await getArticleSourceHeadSha(token);
  const resolvedDraftFiles = await Promise.all(
    files.map(async (file) => ({
      ...file,
      filePath: await resolveArticleFilePath(file.filePath, [baseMainSha, latestMainSha], token),
    })),
  );
  const normalizedFiles = normalizeDraftFileCollection({
    activeFileId,
    files: resolvedDraftFiles,
  });
  const duplicateResolvedPaths = getDuplicateDraftFilePaths(normalizedFiles.files);
  if (duplicateResolvedPaths.length > 0) {
    throw new Error(
      `Duplicate resolved file paths are not allowed: ${duplicateResolvedPaths.join(", ")}`,
    );
  }
  const existingPr = await findArticlePullRequestByBranch(branchName, token);
  if (existingPr) {
    return {
      activeFileId: normalizedFiles.activeFileId,
      files: normalizedFiles.files,
      prNumber: existingPr.number,
      prUrl: existingPr.html_url,
    };
  }
  if (recoverOnly) {
    throw new SubmissionInProgressError();
  }
  try {
    await octokit.git.getRef({
      owner: ARTICLES_REPO.owner,
      repo: ARTICLES_REPO.name,
      ref: `heads/${branchName}`,
    });
  } catch (error) {
    if (!(error instanceof Error) || !("status" in error) || error.status !== 404) throw error;
    await octokit.git.createRef({
      owner: ARTICLES_REPO.owner,
      repo: ARTICLES_REPO.name,
      ref: `refs/heads/${branchName}`,
      sha: latestMainSha,
    });
  }

  if (normalizedFiles.files.length === 1) {
    const file = normalizedFiles.files[0];
    await upsertFileOnBranch({
      authorEmail,
      authorName,
      branchName,
      content: file.content,
      filePath: file.filePath,
      message: `docs: ${title}`,
      token,
    });
  } else if (normalizedFiles.files.length > 1) {
    await upsertFilesOnBranch(
      token,
      normalizedFiles.files.map((file) => ({
        path: file.filePath,
        content: file.content,
      })),
      branchName,
      { name: authorName, email: authorEmail },
    );
  }

  if (imageEntries && imageEntries.length > 0) {
    await upsertFilesOnBranch(token, imageEntries, branchName);
  }

  const { data: pr } = await octokit.pulls.create({
    owner: ARTICLES_REPO.owner,
    repo: ARTICLES_REPO.name,
    title,
    head: branchName,
    base: ARTICLES_SOURCE_BRANCH,
    body: `由 ${authorName} 提交审核。`,
  });

  return {
    activeFileId: normalizedFiles.activeFileId,
    files: normalizedFiles.files,
    prNumber: pr.number,
    prUrl: pr.html_url,
  };
}

export async function getArticlePullRequest(prNumber: number, token?: string) {
  const { data } = await getOctokit(token).pulls.get({
    owner: ARTICLES_REPO.owner,
    repo: ARTICLES_REPO.name,
    pull_number: prNumber,
  });
  return data;
}
