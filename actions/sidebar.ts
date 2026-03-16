"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import {
  getRepoContentTree,
  getRepoTranslations,
  type RepoTreeNode,
} from "@/lib/github-pr";

interface TreeNode {
  id: string;
  title: string;
  slug: string;
  isFolder: boolean;
  parentId: string | null;
  children: TreeNode[];
}

const getCachedRepoTree = unstable_cache(
  async () => {
    return getRepoContentTree();
  },
  ["github-repo-tree"],
  { revalidate: 300 }
);

const getCachedTranslations = unstable_cache(
  async () => {
    return getRepoTranslations();
  },
  ["github-sidebar-translations"],
  { revalidate: 3600 }
);

/**
 * 获取树状结构的目录树 (Sidebar)
 * Tree is built from the GitHub repository, merged with DB articles.
 */
export async function getSidebarTree(): Promise<TreeNode[]> {
  // 1. Get DB article entries (always fresh)
  const allItems = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      isFolder: true,
      parentId: true,
      updatedAt: true,
    },
    orderBy: [{ isFolder: "desc" }, { title: "asc" }],
  });

  const itemMap = new Map<string, TreeNode>();
  const dbRootItems: TreeNode[] = [];

  allItems.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  allItems.forEach((item) => {
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      const child = itemMap.get(item.id);
      if (parent && child) {
        parent.children.push(child);
      } else if (child) {
        dbRootItems.push(child);
      }
    } else {
      const child = itemMap.get(item.id);
      if (child) dbRootItems.push(child);
    }
  });

  // 2. Get GitHub repo tree (cached)
  let githubTree: RepoTreeNode[] = [];
  try {
    githubTree = await getCachedRepoTree();
  } catch (e) {
    console.error("Failed to fetch GitHub repo tree:", e);
  }

  // 3. Get translations (cached)
  let translations: Record<string, string> = {};
  try {
    translations = await getCachedTranslations();
  } catch (e) {
    console.error("Failed to fetch sidebar translations:", e);
  }

  // 4. Merge: GitHub tree first, then DB articles
  const mergedTree: TreeNode[] = [
    ...(githubTree as TreeNode[]),
    ...dbRootItems,
  ];

  // 5. Apply translations to top-level titles
  mergedTree.forEach((node) => {
    if (translations[node.title]) {
      node.title = translations[node.title];
    }
  });

  return mergedTree;
}

/**
 * 新建文件或文件夹（DB 侧边栏条目）
 */
export async function createDocument({
  title,
  slug,
  isFolder = false,
  parentId = null,
}: {
  title: string;
  slug: string;
  isFolder?: boolean;
  parentId?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权，请先登录");
  }

  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("该路径 (Slug) 已存在");
  }

  const newDoc = await prisma.article.create({
    data: {
      title,
      slug,
      content: isFolder ? "" : "# " + title,
      isFolder,
      parentId,
      authorId: session.user.id,
    },
  });

  return newDoc;
}
