/* ===== Conflict Block Types ===== */

/**
 * Canonical conflict data type for rerere resolution tracking.
 * String-based content (serialized form), includes metadata.
 */
export interface ConflictBlock {
  id: string
  filePath: string
  base: string
  ours: string
  theirs: string
  autoApplied?: { resolution: string; source: "rerere" }
}

/**
 * Merge algorithm conflict block (diff3 output).
 * Array-based content (line-split), discriminated union member.
 * Structurally distinct from ConflictBlock — not interchangeable.
 */
export interface MergeConflictBlock {
  type: "conflict"
  ours: string[]
  base: string[]
  theirs: string[]
}

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
