interface GithubEmailRecord {
  email: string
  primary: boolean
  visibility: "public" | "private"
}

function isGithubEmailRecord(value: unknown): value is GithubEmailRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    typeof value.email === "string" &&
    "primary" in value &&
    typeof value.primary === "boolean" &&
    "visibility" in value &&
    (value.visibility === "public" || value.visibility === "private")
  )
}

export async function getGithubEmailVisibility(
  token: string
): Promise<"private" | "public"> {
  if (!token) {
    return "private"
  }

  try {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return "private"
    }

    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      return "private"
    }

    const primaryEmail = data.find(
      (email): email is GithubEmailRecord =>
        isGithubEmailRecord(email) && email.primary
    )

    return primaryEmail?.visibility === "public" ? "public" : "private"
  } catch {
    return "private"
  }
}
