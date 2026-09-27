export interface ChapterNavNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  parentId: string | null
  children: ChapterNavNode[]
  index?: number
  isAppendix?: boolean
  isPreface?: boolean
  isReadmeIntro?: boolean
  introTitle?: string
  isAdvanced?: boolean
}
