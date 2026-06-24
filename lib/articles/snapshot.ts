import { mergeDiff3 } from "node-diff3"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { reviewError, summarizeSha } from "@/lib/logging"

export interface FileSnapshot {
  content: string
  sha?: string
}

// NOTE: intentionally goes through @/lib/github/articles-repo (not
// @/lib/github/branch) so test mocks of that module apply.
export async function getFileSnapshot(
  filePath: string,
  ref: string,
  token?: string
): Promise<FileSnapshot | null> {
  const octokit = getOctokit(token)

  try {
    const { data } = await octokit.repos.getContent({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      path: filePath,
      ref,
    })

    if (Array.isArray(data) || data.type !== "file") {
      return null
    }

    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
    }
  } catch (error) {
    reviewError("getFileSnapshot", error, {
      filePath,
      ref: summarizeSha(ref),
      status: "github-api-error",
      operation: "repos.getContent",
    })
    return null
  }
}

export function mergeArticleContent({
  baseContent,
  draftContent,
  latestMainContent,
}: {
  baseContent: string
  draftContent: string
  latestMainContent: string
}) {
  const result = mergeDiff3(
    splitLines(draftContent),
    splitLines(baseContent),
    splitLines(latestMainContent),
    {
      label: {
        a: "draft",
        o: "base",
        b: "main",
      },
    }
  )

  return {
    conflict: result.conflict,
    content: joinLines(result.result),
  }
}

function splitLines(content: string) {
  if (!content) {
    return [] as string[]
  }

  return content.replaceAll("\r\n", "\n").split("\n")
}

function joinLines(lines: string[]) {
  return lines.join("\n")
}
