import { updateTag } from "next/cache"

export const GITHUB_ISSUES_TAG = "github-issues"

export function githubIssueTag(issueNumber: number): string {
  return `github-issue-${issueNumber}`
}

export function githubIssueCommentsTag(issueNumber: number): string {
  return `github-comments-${issueNumber}`
}

export function updateGithubIssueCache(issueNumber: number): void {
  updateTag(GITHUB_ISSUES_TAG)
  updateTag(githubIssueTag(issueNumber))
}

export function updateGithubIssueCommentsCache(issueNumber: number): void {
  updateTag(githubIssueCommentsTag(issueNumber))
}
