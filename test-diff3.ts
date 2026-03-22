import {
  getOctokit,
  ARTICLES_REPO_OWNER,
  ARTICLES_REPO_NAME,
} from "./lib/github-pr"
const octokit = getOctokit(process.env.GITHUB_ARTICLES_WRITE_PAT)
octokit.pulls
  .get({ owner: ARTICLES_REPO_OWNER, repo: ARTICLES_REPO_NAME, pull_number: 1 })
  .then(async (pr) => {
    const mainRef = await octokit.git.getRef({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      ref: "heads/main",
    })
    const compare = await octokit.repos.compareCommits({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      base: mainRef.data.object.sha,
      head: pr.data.head.sha,
    })
    console.log("Ancestor:", compare.data.merge_base_commit.sha)
  })
