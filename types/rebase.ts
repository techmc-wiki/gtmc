export type RebaseStatus =
  | "IDLE"
  | "IN_PROGRESS"
  | "CONFLICT"
  | "COMPLETED"
  | "ABORTED"

export interface RebaseCommitInfo {
  sha: string
  message: string
  author: string
  timestamp: string
}

export interface RebaseState {
  status: RebaseStatus
  commitShas: string[]
  currentCommitIndex: number
  conflictedCommitSha?: string
  originalContent: string
  resolvedContent?: string
  commitInfos: RebaseCommitInfo[]
}
