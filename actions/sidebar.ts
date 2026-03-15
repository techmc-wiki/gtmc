"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

interface TreeNode {
  id: string;
  title: string;
  slug: string;
  isFolder: boolean;
  parentId: string | null;
  children: TreeNode[];
}

/**
 * Helper to recursively read local assets
 */
function getLocalFiles(dir: string, basePath = ""): TreeNode[] {
  const results: TreeNode[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (
        item.startsWith(".") ||
        item === "node_modules" ||
        item.toLowerCase() === "readme.md" ||
        ["img", "oldimg", "image", "images", "source", "asset"].includes(item.toLowerCase())
      ) {
        continue;
      }
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      const slug = basePath ? `${basePath}/${item}` : item;

      if (stat.isDirectory()) {
        results.push({
          id: `local-${slug}`,
          title: item,
          slug: slug,
          isFolder: true,
          parentId: basePath ? `local-${basePath}` : null,
          children: getLocalFiles(fullPath, slug),
        });
      } else if (item.endsWith(".md")) {
        const titleName = item.replace(/\.md$/, "");
        const fileSlug = basePath ? `${basePath}/${titleName}` : titleName;
        results.push({
          id: `local-${fileSlug}`,
          title: titleName,
          slug: fileSlug,
          isFolder: false,
          parentId: basePath ? `local-${basePath}` : null,
          children: [],
        });
      }
    }
  } catch (e) {
    console.error("Error reading local files", e);
  }
  return results.sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.title.localeCompare(b.title);
    return a.isFolder ? -1 : 1;
  });
}

/**
 * 获取树状结构的目录树 (Sidebar)
 */
export async function getSidebarTree(): Promise<TreeNode[]> {
  // 1. Get database entries
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

  // Build DB tree
  const itemMap = new Map<string, TreeNode>();
  const rootItems: TreeNode[] = [];

  allItems.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  allItems.forEach((item) => {
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        const child = itemMap.get(item.id);
        if (child) {
          parent.children.push(child);
        }
      } else {
        const child = itemMap.get(item.id);
        if (child) {
          rootItems.push(child);
        }
      }
    } else {
      const child = itemMap.get(item.id);
      if (child) {
        rootItems.push(child);
      }
    }
  });

  // 2. Get local filesystem entries
  const assetsPath = path.join(process.cwd(), "assets");
  const localTree = getLocalFiles(assetsPath);

  // Read translations configuration
  let translations: Record<string, string> = {};
  try {
    const transPath = path.join(process.cwd(), "assets", "sidebar-translations.json");
    if (fs.existsSync(transPath)) {
      const fileContent = fs.readFileSync(transPath, "utf-8");
      // Remove UTF-8 BOM if present
      translations = JSON.parse(fileContent.replace(/^\uFEFF/, ''));
    }
  } catch (e) {
    console.error("加载侧边栏翻译配置失败", e);
  }

  // 3. Merge them based on same path/slug hierarchy
  // For simplicity we just return them side by side, local first, then DB
  const mergedTree = [...localTree, ...rootItems];

  // 4. Translate top-level folders/items
  mergedTree.forEach((node) => {
    if (translations[node.title]) {
      node.title = translations[node.title];
    }
  });

  return mergedTree;
}

/**
 * 新建文件或文件夹
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

  // Check if slug exists
  const existing = await prisma.article.findUnique({
    where: { slug },
  });
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
