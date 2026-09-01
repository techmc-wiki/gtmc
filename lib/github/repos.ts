import { Octokit } from "@octokit/rest"
import { resolveGithubToken } from "./tokens"

export type RepoTarget = { owner: string; name: string }

export const ARTICLES_REPO: RepoTarget = {
  owner: process.env.GITHUB_ARTICLES_REPO_OWNER || "gtmc-dev",
  name: process.env.GITHUB_ARTICLES_REPO_NAME || "Articles",
}

export const getArticlesCommitUrl = (revision: string): string =>
  `https://github.com/${ARTICLES_REPO.owner}/${ARTICLES_REPO.name}/commit/${revision}`

export const GLOSSARY_REPO: RepoTarget = {
  owner: process.env.GITHUB_GLOSSARY_REPO_OWNER || "TechMC-Glossary",
  name: process.env.GITHUB_GLOSSARY_REPO_NAME || "TechMC-Glossary",
}

export const GLOSSARY_FORK_REPO: RepoTarget = {
  owner: process.env.GITHUB_GLOSSARY_FORK_REPO_OWNER || "techmc-wiki",
  name: process.env.GITHUB_GLOSSARY_FORK_REPO_NAME || "glossary",
}
export const getOctokit = (token?: string, silent404 = false) =>
  new Octokit({
    auth: token ?? resolveGithubToken(),
    log: silent404
      ? {
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
        }
      : undefined,
  })
