/**
 * Node of the article tree domain model shared by manifests, navigation,
 * article requests and the GitHub repository content tree.
 */
export interface ArticleTreeNode {
  id: string;
  title: string;
  slug: string;
  isFolder: boolean;
  introTitle?: string;
  isAdvanced?: boolean;
  parentId: string | null;
  children: ArticleTreeNode[];
}
