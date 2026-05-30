import { Octokit } from "@octokit/rest"
import {
  resolveGithubArticlesReadToken,
  resolveGithubGlossaryWriteToken,
} from "./tokens"

export type RepoTarget = { owner: string; name: string }

export const ARTICLES_REPO: RepoTarget = {
  owner:
    process.env.GITHUB_ARTICLES_REPO_OWNER ||
    process.env.GITHUB_REPO_OWNER ||
    "gtmc-dev",
  name: process.env.GITHUB_ARTICLES_REPO_NAME || "Articles",
}

export const GLOSSARY_REPO: RepoTarget = {
  owner: process.env.GITHUB_GLOSSARY_REPO_OWNER || "TechMC-Glossary",
  name: process.env.GITHUB_GLOSSARY_REPO_NAME || "TechMC-Glossary",
}

export const getOctokit = (token?: string, silent404 = false) =>
  new Octokit({
    auth: token || resolveGithubArticlesReadToken(),
    log: silent404
      ? {
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
        }
      : undefined,
  })

export const getGlossaryWriteToken = (
  fallbackToken?: string | null
): string => {
  const token = resolveGithubGlossaryWriteToken(fallbackToken)
  if (!token) throw new Error("GITHUB_GLOSSARY_WRITE_PAT not configured")
  return token
}
