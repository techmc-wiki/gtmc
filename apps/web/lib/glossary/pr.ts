import { getMainBranchHeadSha, upsertFileOnBranch } from "@/lib/github/branch"
import {
  GLOSSARY_FORK_REPO,
  GLOSSARY_REPO,
  getOctokit,
} from "@/lib/github/repos"

const GLOSSARY_MAIN_BRANCH = "main"
const GLOSSARY_CSV_PATH = "TechMC Glossary.csv"
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

  // Base the fork branch on upstream main so a lagging fork cannot add reverse
  // diffs to the pull request.
  const upstreamHeadSha = await getMainBranchHeadSha(token, GLOSSARY_REPO)

  await octokit.git.createRef({
    owner: GLOSSARY_FORK_REPO.owner,
    repo: GLOSSARY_FORK_REPO.name,
    ref: `refs/heads/${branchName}`,
    sha: upstreamHeadSha,
  })

  await upsertFileOnBranch({
    authorEmail,
    authorName,
    branchName,
    content: csvContent,
    filePath: GLOSSARY_CSV_PATH,
    message: `docs: ${title}`,
    token,
    repo: GLOSSARY_FORK_REPO,
  })

  try {
    const { data: pr } = await octokit.pulls.create({
      owner: GLOSSARY_REPO.owner,
      repo: GLOSSARY_REPO.name,
      title,
      head: `${GLOSSARY_FORK_REPO.owner}:${branchName}`,
      base: GLOSSARY_MAIN_BRANCH,
      body,
    })

    return {
      prUrl: pr.html_url,
      prNumber: pr.number,
      branchName,
    }
  } catch (error) {
    const status = (error as { status?: number } | null)?.status
    const message = (error as { message?: string } | null)?.message ?? ""
    if (status === 403 && message.includes("Resource not accessible")) {
      throw new Error(
        `GitHub rejected pull request creation with 403. ` +
          `Fine-grained PATs cannot act across two organizations, so ` +
          `${GLOSSARY_REPO.owner}/${GLOSSARY_REPO.name} cannot be added to ` +
          `their repository access. Set GITHUB_TOKEN to a classic PAT with the public_repo ` +
          `scope.`,
        { cause: error }
      )
    }
    throw error
  }
}
