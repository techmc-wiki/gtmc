'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

/**
 * Helper to recursively read local assets
 */
function getLocalFiles(dir: string, basePath = ''): any[] {
  let results: any[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (
        item.startsWith('.') || 
        item === 'node_modules' || 
        item.toLowerCase() === 'readme.md' ||
        ['img', 'oldimg', 'image', 'images', 'source', 'asset'].includes(item.toLowerCase())
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
          children: getLocalFiles(fullPath, slug)
        });
      } else if (item.endsWith('.md')) {
        const titleName = item.replace(/\.md$/, '');
        const fileSlug = basePath ? `${basePath}/${titleName}` : titleName;
        results.push({
          id: `local-${fileSlug}`,
          title: titleName,
          slug: fileSlug,
          isFolder: false,
          parentId: basePath ? `local-${basePath}` : null,
          children: []
        });
      }
    }
  } catch (e) {
    console.error('Error reading local files', e);
  }
  return results.sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.title.localeCompare(b.title);
    return a.isFolder ? -1 : 1;
  });
}

/**
 * 获取树状结构的目录树 (Sidebar)
 */
export async function getSidebarTree() {
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
    orderBy: [
      { isFolder: 'desc' },
      { title: 'asc' }
    ]
  });

  // Build DB tree
  const itemMap = new Map();
  const rootItems: any[] = [];

  allItems.forEach((item: any) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  allItems.forEach((item: any) => {
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        parent.children.push(itemMap.get(item.id));
      } else {
        rootItems.push(itemMap.get(item.id));
      }
    } else {
      rootItems.push(itemMap.get(item.id));
    }
  });

  // 2. Get local filesystem entries
  const assetsPath = path.join(process.cwd(), 'assets');
  const localTree = getLocalFiles(assetsPath);

  // 3. Merge them based on same path/slug hierarchy
  // For simplicity we just return them side by side, local first, then DB
  return [...localTree, ...rootItems];
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
    throw new Error('未授权，请先登录');
  }

  // Check if slug exists
  const existing = await prisma.article.findUnique({
    where: { slug }
  });
  if (existing) {
    throw new Error('该路径 (Slug) 已存在');
  }

  const newDoc = await prisma.article.create({
    data: {
      title,
      slug,
      content: isFolder ? '' : '# ' + title,
      isFolder,
      parentId,
      authorId: session.user.id
    }
  });

  return newDoc;
}
