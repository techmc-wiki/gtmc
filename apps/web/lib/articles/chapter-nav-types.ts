import type { ArticleTreeNode } from "@/lib/articles/article-tree-types";

export interface ChapterNavNode extends ArticleTreeNode {
  children: ChapterNavNode[];
  index?: number;
  isAppendix?: boolean;
  isPreface?: boolean;
  isReadmeIntro?: boolean;
}
