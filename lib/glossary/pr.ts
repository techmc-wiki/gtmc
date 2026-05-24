import { GLOSSARY_REPO, getOctokit } from "@/lib/github/repos"
import { getMainBranchHeadSha, upsertFileOnBranch } from "@/lib/github/branch"
import { GLOSSARY_MAIN_BRANCH, GLOSSARY_CSV_PATH } from "./repo"

export interface GlossaryPrInput {
  csvContent: string
  title: string
  body: string
  branchName: string
  authorName: string
  authorEmail: string
  token: string
}

export interface GlossaryPrResult {
  prUrl: string
  prNumber: number
  branchName: string
}

export async function openGlossaryPullRequest(
  input: GlossaryPrInput
): Promise<GlossaryPrResult> {
  const {
    csvContent,
    title,
    body,
    branchName,
    authorName,
    authorEmail,
    token,
  } = input
  const octokit = getOctokit(token)

  const mainSha = await getMainBranchHeadSha(token, GLOSSARY_REPO)

  await octokit.git.createRef({
    owner: GLOSSARY_REPO.owner,
    repo: GLOSSARY_REPO.name,
    ref: `refs/heads/${branchName}`,
    sha: mainSha,
  })

  await upsertFileOnBranch({
    authorEmail,
    authorName,
    branchName,
    content: csvContent,
    filePath: GLOSSARY_CSV_PATH,
    message: `docs: ${title}`,
    token,
    repo: GLOSSARY_REPO,
  })

  const { data: pr } = await octokit.pulls.create({
    owner: GLOSSARY_REPO.owner,
    repo: GLOSSARY_REPO.name,
    title,
    head: branchName,
    base: GLOSSARY_MAIN_BRANCH,
    body,
  })

  return {
    prUrl: pr.html_url,
    prNumber: pr.number,
    branchName,
  }
}
