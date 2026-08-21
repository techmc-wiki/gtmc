function resolveFirstDefinedToken(
  candidates: Array<string | null | undefined>
): string | undefined {
  const token = candidates.find(
    (value) => typeof value === "string" && value.length > 0
  )
  return token ?? undefined
}

export function resolveGithubArticlesReadToken(): string | undefined {
  return resolveFirstDefinedToken([
    process.env.GITHUB_ARTICLES_READ_PAT,
    process.env.GITHUB_ARTICLES_WRITE_PAT,
    process.env.GITHUB_TOKEN,
    process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  ])
}

export function resolveGithubArticlesWriteToken(
  fallbackToken?: string | null
): string | undefined {
  return resolveFirstDefinedToken([
    process.env.GITHUB_ARTICLES_WRITE_PAT,
    process.env.GITHUB_TOKEN,
    process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
    fallbackToken,
    process.env.GITHUB_ARTICLES_READ_PAT,
  ])
}

export function resolveGithubGlossaryWriteToken(): string | undefined {
  const token = process.env.GITHUB_PUBLIC_REPO_PAT
  return typeof token === "string" && token.length > 0 ? token : undefined
}
