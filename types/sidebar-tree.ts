export interface TreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  parentId: string | null
  children: TreeNode[]
  index?: number
  isAppendix?: boolean
  isPreface?: boolean
  isReadmeIntro?: boolean
  introTitle?: string
  isAdvanced?: boolean
}
