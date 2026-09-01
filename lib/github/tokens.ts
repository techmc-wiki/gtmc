function resolveFirstDefinedToken(
  candidates: Array<string | null | undefined>
): string | undefined {
  const token = candidates.find(
    (value) => typeof value === "string" && value.length > 0
  )
  return token ?? undefined
}

/** Resolve the deployment GitHub credential or an explicit user fallback. */
export function resolveGithubToken(
  fallbackToken?: string | null
): string | undefined {
  return resolveFirstDefinedToken([process.env.GITHUB_TOKEN, fallbackToken])
}
