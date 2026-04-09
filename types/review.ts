export type ConflictMode = "FINE_GRAINED" | "SIMPLE"

export type ReviewMergeMethod = "squash" | "rebase" | "direct"

export interface ReviewMergeStrategyAnalysis {
  recommendation: ReviewMergeMethod
  availableMethods: ReviewMergeMethod[]
  rationale: string
}

export interface ReviewFile {
  id: string
  filePath: string
  content: string
  originalContent: string
  conflictContent?: string
  status: "clean" | "conflict" | "resolved"
  changeType?: "added" | "modified" | "removed" | "renamed"
  additions?: number
  deletions?: number
}

export interface ModeAnalysis {
  recommendation: ConflictMode
  commitCount: number
  filesAffected: number
  adminMessage: string
}

export interface ReviewSessionState {
  mode: ConflictMode | null
  files: ReviewFile[]
  activeFileId: string
  modeAnalysis: ModeAnalysis
}

export interface RerereMatch {
  conflictHash: string
  resolution: string
  filePath: string
}
