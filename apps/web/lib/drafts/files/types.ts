export interface DraftFileRecord {
  id: string
  filePath: string
  content: string
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
