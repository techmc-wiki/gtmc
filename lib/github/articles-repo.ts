import { resolveGithubArticlesWriteToken } from "@/lib/github/tokens"

export { ARTICLES_REPO, getOctokit } from "./repos"
export { ARTICLES_REPO as ARTICLES_REPO_TARGET } from "./repos"

import { ARTICLES_REPO } from "./repos"

export const ARTICLES_REPO_OWNER = ARTICLES_REPO.owner
export const ARTICLES_REPO_NAME = ARTICLES_REPO.name

export const getGitHubWriteToken = (fallbackToken?: string | null) =>
  resolveGithubArticlesWriteToken(fallbackToken)
