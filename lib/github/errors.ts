import { RequestError } from "@octokit/request-error"

export function getGithubErrorStatus(error: unknown): number | undefined {
  return error instanceof RequestError ? error.status : undefined
}
