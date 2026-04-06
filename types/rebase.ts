import type { ConflictBlock } from "@/lib/rerere"

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

export interface FileRebaseState {
  filePath: string
  status: "pending" | "in_progress" | "conflict" | "completed"
  currentContent: string
  originalContent: string
}

export interface RebaseState {
  status: RebaseStatus
  commitShas: string[]
  currentCommitIndex: number
  conflictedCommitSha?: string
  originalContent: string
  resolvedContent?: string
  commitInfos: RebaseCommitInfo[]
  fileStates?: Record<string, FileRebaseState>
  rerereApplied?: ConflictBlock[]
}
