export interface DraftFileRecord {
  id: string
  filePath: string
  content: string
  conflictContent?: string | null
}

export interface DraftFileCollection {
  activeFileId: string
  folders: string[]
  files: DraftFileRecord[]
}

export interface DraftFileCollectionInput {
  activeFileId?: string
  folders?: string[]
  files?: Array<Partial<DraftFileRecord>>
}

export interface DraftBundleFileRecord {
  id?: string
  filePath?: string
  content?: string
}

export interface DraftBundleRecord {
  version: 1
  activeFileId?: string
  folders?: string[]
  files: DraftBundleFileRecord[]
}

export const DRAFT_BUNDLE_PREFIX = "GTMC_DRAFT_BUNDLE_V1:"
