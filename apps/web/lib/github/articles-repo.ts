import { resolveGithubToken } from "@/lib/github/tokens"

export { ARTICLES_REPO, getOctokit } from "./repos"

import { ARTICLES_REPO } from "./repos"

export const ARTICLES_REPO_OWNER = ARTICLES_REPO.owner
export const ARTICLES_REPO_NAME = ARTICLES_REPO.name

export const getGitHubWriteToken = (fallbackToken?: string | null) =>
  resolveGithubToken(fallbackToken)
