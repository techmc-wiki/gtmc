export type ConflictMode = "FINE_GRAINED" | "SIMPLE"

export interface ReviewFile {
  id: string
  filePath: string
  content: string
  originalContent: string
  conflictContent?: string
  status: "clean" | "conflict" | "resolved"
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
