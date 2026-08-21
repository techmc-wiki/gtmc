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

  // 1. Get HEAD commit of main branch on the upstream repo
  // (TechMC-Glossary/TechMC-Glossary). Branching the fork at the upstream
  // head keeps the pull request free of reverse-diffs whenever our fork's
  // main falls behind upstream.
  const upstreamHeadSha = await getMainBranchHeadSha(token, GLOSSARY_REPO)

  // 2. Create the new branch in our fork at that upstream commit
  await octokit.git.createRef({
    owner: GLOSSARY_FORK_REPO.owner,
    repo: GLOSSARY_FORK_REPO.name,
    ref: `refs/heads/${branchName}`,
    sha: upstreamHeadSha,
  })

  // 3. Commit the updated CSV file to that branch in our fork
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
    // 4. Open cross-repository Pull Request from our fork's branch to
    // upstream main
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
          `GITHUB_PUBLIC_REPO_PAT must grant "Pull requests: Read ` +
          `and write" on ${GLOSSARY_REPO.owner}/${GLOSSARY_REPO.name} (the ` +
          `repo the PR is opened on) as well as ` +
          `${GLOSSARY_FORK_REPO.owner}/${GLOSSARY_FORK_REPO.name}; a ` +
          `classic PAT with the public_repo scope also works.`,
        { cause: error }
      )
    }
    throw error
  }
}
