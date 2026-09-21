import { getOctokit } from "./repos"

export async function getGithubEmailVisibility(
  token: string
): Promise<"private" | "public"> {
  if (!token) return "private"

  try {
    const { data } =
      await getOctokit(token).users.listEmailsForAuthenticatedUser()
    return data.find((email) => email.primary)?.visibility === "public"
      ? "public"
      : "private"
  } catch {
    return "private"
  }
}
