import { Octokit } from "@octokit/rest"
import {
  resolveGithubArticlesReadToken,
  resolveGithubArticlesWriteToken,
} from "@/lib/github/tokens"

export const ARTICLES_REPO_OWNER =
  process.env.GITHUB_ARTICLES_REPO_OWNER ||
  process.env.GITHUB_REPO_OWNER ||
  "gtmc-dev"

export const ARTICLES_REPO_NAME =
  process.env.GITHUB_ARTICLES_REPO_NAME || "Articles"

const getGitHubReadToken = () => resolveGithubArticlesReadToken()

export const getGitHubWriteToken = (fallbackToken?: string | null) =>
  resolveGithubArticlesWriteToken(fallbackToken)

export const getOctokit = (token?: string, silent404 = false) => {
  return new Octokit({
    auth: token || getGitHubReadToken(),
    log: silent404
      ? {
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
        }
      : undefined,
  })
}
