import { cacheLife, cacheTag } from "next/cache";
import { shouldIgnoreDirectory, shouldIgnoreFile } from "@/lib/articles/ignore";
import type { ArticleLocale } from "@/lib/articles/manifest";
import { getCachedArticleTree } from "@/lib/articles/manifest-cached";
import type { ArticleTreeNode } from "@/lib/github/sync";
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types";
import { compareIndex } from "@/lib/articles/navigation-data";

function normalizeNodeValue(value: string) {
  return value.trim().toLowerCase().replace(/\.md$/, "");
}

function isReadmeArticle(node: ChapterNavNode): boolean {
  if (node.isFolder) {
    return false;
  }

  const slugTail = node.slug.split("/").pop() ?? "";

  return (
    normalizeNodeValue(node.title) === "readme" ||
    normalizeNodeValue(slugTail) === "readme"
  );
}

function assignAppendixOwner(
  node: ChapterNavNode,
  appendixOwner: NonNullable<ChapterNavNode["appendixOwner"]>,
): ChapterNavNode {
  return {
    ...node,
    isAppendix: true,
    appendixOwner,
    children: node.children.map((child) =>
      assignAppendixOwner(child, appendixOwner),
    ),
  };
}

/**
 * 获取公开章节导航树。
 * Chapter navigation is built from the public article source only.
 */
export async function getPublicChapterNav(
  locale: ArticleLocale = "zh",
): Promise<ChapterNavNode[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("article-tree", `article-tree-${locale}`);

  return preparePublicChapterNav(await getCachedArticleTree(locale));
}

export function preparePublicChapterNav(
  source: ArticleTreeNode[],
): ChapterNavNode[] {
  const clonedTree = cloneNodes(source);
  const filteredTree = filterIgnoredNodes(clonedTree, true);

  injectReadmeIntroNodes(filteredTree);
  sortTree(filteredTree);

  return filteredTree;
}

function cloneNodes(nodes: ArticleTreeNode[]): ChapterNavNode[] {
  return nodes.map((node) => {
    const nodeWithMeta = node as ArticleTreeNode & Partial<ChapterNavNode>;

    return {
      ...node,
      index: nodeWithMeta.index ?? -1,
      isAppendix: nodeWithMeta.isAppendix ?? false,
      isPreface: nodeWithMeta.isPreface ?? false,
      isAdvanced: nodeWithMeta.isAdvanced ?? false,
      introTitle: nodeWithMeta.introTitle ?? "",
      children: cloneNodes(node.children),
    };
  });
}

function sortTree(nodes: ChapterNavNode[]) {
  nodes.sort((a, b) => {
    if (a.isPreface !== b.isPreface) {
      return a.isPreface ? -1 : 1;
    }

    if (a.isReadmeIntro !== b.isReadmeIntro) {
      return a.isReadmeIntro ? -1 : 1;
    }

    const indexComparison = compareIndex(a.index ?? -1, b.index ?? -1);
    if (indexComparison !== 0) {
      return indexComparison;
    }

    if (a.isAppendix !== b.isAppendix) {
      return a.isAppendix ? 1 : -1;
    }

    const titleComparison = a.title.localeCompare(b.title);
    if (titleComparison !== 0) {
      return titleComparison;
    }

    return a.slug.localeCompare(b.slug);
  });
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      sortTree(node.children);
    }
  }
}

function filterIgnoredNodes(
  nodes: ChapterNavNode[],
  isRoot: boolean,
): ChapterNavNode[] {
  const result: ChapterNavNode[] = [];
  for (const node of nodes) {
    if (node.isFolder) {
      if (shouldIgnoreDirectory(node.title)) {
        continue;
      }
    } else {
      if (shouldIgnoreFile(node.title, isRoot)) {
        continue;
      }
    }

    const filteredNode = {
      ...node,
      children: filterIgnoredNodes(node.children, false),
    };

    if (filteredNode.isFolder && filteredNode.isAppendix) {
      const appendixOwner = {
        slug: filteredNode.slug,
        title: filteredNode.title,
      };
      const promotedChildren = filteredNode.children.filter(
        (child) => child.isFolder || !isReadmeArticle(child),
      );

      for (const child of promotedChildren) {
        result.push({
          ...assignAppendixOwner(child, appendixOwner),
          parentId: filteredNode.parentId,
        });
      }
      continue;
    }

    result.push(filteredNode);
  }
  return result;
}

function injectReadmeIntroNodes(nodes: ChapterNavNode[]) {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      injectReadmeIntroNodes(node.children);
    }

    const introTitle = node.introTitle?.trim() ?? "";
    if (!node.isFolder || node.isPreface || introTitle === "") {
      continue;
    }

    const hasInjectedIntro = node.children.some((child) => child.isReadmeIntro);
    if (hasInjectedIntro) {
      continue;
    }

    node.children.push({
      id: `${node.slug}/readme-intro`,
      title: introTitle,
      slug: node.slug,
      index: -1,
      isFolder: false,
      isAppendix: node.isAppendix ?? false,
      isPreface: false,
      isAdvanced: false,
      isReadmeIntro: true,
      parentId: node.id,
      children: [],
      ...(node.appendixOwner ? { appendixOwner: node.appendixOwner } : {}),
    });
  }
}
