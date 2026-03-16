"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createDocument } from "@/actions/sidebar";

// 定义 H2 标题的数据结构
interface TocItem {
  id: string;
  text: string;
}

interface TreeNode {
  id: string;
  title: string;
  slug: string;
  isFolder: boolean;
  parentId: string | null;
  children: TreeNode[];
}

export function SidebarClient({ tree, onNavigate }: { tree: TreeNode[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: "",
    slug: "",
    isFolder: false,
    parentId: "",
  });

  const [toc, setToc] = useState<TocItem[]>([]);
  const [isFileExpanded, setIsFileExpanded] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    const maxFrames = 10;

    const scanHeadings = () => {
      const headings = document.querySelectorAll("main h2");
      if (headings.length > 0) {
        const tocItems: TocItem[] = [];
        headings.forEach((heading) => {
          if (heading.id && heading.textContent) {
            tocItems.push({
              id: heading.id,
              text: heading.textContent.replace(/^#\s*/, ""),
            });
          }
        });
        setToc(tocItems);
        return true;
      }
      return false;
    };

    const retryWithRAF = () => {
      if (scanHeadings()) return;
      if (frameCount < maxFrames) {
        frameCount++;
        requestAnimationFrame(retryWithRAF);
      }
    };

    retryWithRAF();
  }, [pathname]);

  // 当路径改变时，默认展开当前文章的目录
  useEffect(() => {
    setIsFileExpanded(true);
  }, [pathname]);

  const toggleFileExp = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFileExpanded((prev) => !prev);
  };

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gtmc_sidebar_expanded");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setExpandedFolders(new Set(parsed));
        }
      }
    } catch (e) {
      console.error("Failed to load sidebar state", e);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("gtmc_sidebar_expanded", JSON.stringify(Array.from(expandedFolders)));
    }
  }, [expandedFolders, mounted]);

  const isFolderExpanded = useCallback(
    (id: string) => {
      if (!mounted) return false; // 服务器渲染和初次加载时默认全部闭合
      return expandedFolders.has(id);
    },
    [expandedFolders, mounted],
  );

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDocument({
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-"),
        isFolder: formData.isFolder,
        parentId: formData.parentId || null,
      });
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(message);
    }
  };

  const renderTree = (items: TreeNode[], level = 0) => {
    return (
      <ul className="border-tech-main/20 my-1 border-l pl-4">
        {items.map((item) => {
          const fileRoute = `/articles/${item.slug}`;
          const decodedPathname = decodeURIComponent(pathname);
          const decodedRoute = decodeURIComponent(fileRoute);
          const isActive =
            !item.isFolder &&
            (decodedPathname === decodedRoute || decodedPathname === `${decodedRoute}/`);

          const folderExpanded = item.isFolder ? isFolderExpanded(item.id) : false;

          return (
            <li key={item.id} className="my-1.5 list-none font-mono text-[15px] md:text-base">
              {item.isFolder ? (
                <button
                  onClick={(e) => toggleFolder(item.id, e)}
                  className="text-tech-main/80 hover:text-tech-main mt-3 mb-1 flex w-full cursor-pointer items-center text-left font-bold uppercase opacity-80 transition-colors focus:outline-none"
                >
                  <span className="text-tech-main/50 inline-block w-4 text-xs">
                    {folderExpanded ? "▼" : "▶"}
                  </span>
                  <span>{item.title}</span>
                </button>
              ) : (
                <div className="relative">
                  <div
                    className={`group relative -ml-4 flex items-center py-1.5 pl-4 transition-colors ${isActive ? "text-tech-main font-bold" : "hover:text-tech-main text-slate-700"}`}
                  >
                    {isActive && toc.length > 0 ? (
                      <button
                        onClick={toggleFileExp}
                        className="text-tech-main hover:text-tech-main/80 absolute top-1/2 left-0 z-10 -translate-y-1/2 cursor-pointer text-[10px] transition-opacity focus:outline-none md:text-xs"
                        title={isFileExpanded ? "收起目录" : "展开目录"}
                      >
                        {isFileExpanded ? "▼" : "▶"}
                      </button>
                    ) : (
                      <span
                        className={`absolute top-1/2 left-0 -translate-y-1/2 text-xs transition-opacity md:text-sm ${isActive ? "text-tech-main opacity-100" : "text-tech-main opacity-0 group-hover:opacity-100"}`}
                      >
                        &gt;
                      </span>
                    )}
                    <Link
                      href={fileRoute}
                      onClick={(e) => {
                        if (isActive) {
                          e.preventDefault();
                          setIsFileExpanded((prev) => !prev);
                        } else {
                          onNavigate?.();
                        }
                      }}
                      className={`block w-full border-b pb-px pl-1 ${isActive ? "border-tech-main/50 cursor-pointer" : "group-hover:border-tech-main/30 border-transparent"}`}
                    >
                      {item.title}
                    </Link>
                  </div>
                  {/* 二级标题展示（三级目录） */}
                  {isActive && toc.length > 0 && (
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isFileExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <ul className="border-tech-main/20 mt-1 mb-2 ml-1 space-y-2 border-l pl-4">
                          {toc.map((h2) => (
                            <li
                              key={h2.id}
                              className="text-tech-main/70 hover:text-tech-main before:bg-tech-main/30 relative text-[13px] transition-colors before:absolute before:top-1/2 before:-left-4 before:h-px before:w-2 before:-translate-y-1/2 before:content-[''] md:text-sm"
                            >
                              <Link
                                href={`#${h2.id}`}
                                onClick={() => onNavigate?.()}
                                className="block wrap-break-word"
                              >
                                {h2.text}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {item.children && item.children.length > 0 && (
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    !item.isFolder || folderExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">{renderTree(item.children, level + 1)}</div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const flattenFolders = useCallback((items: TreeNode[]): TreeNode[] => {
    let folders: TreeNode[] = [];
    items.forEach((item) => {
      if (item.isFolder) {
        folders.push(item);
        if (item.children) folders = [...folders, ...flattenFolders(item.children)];
      }
    });
    return folders;
  }, []);

  const availableFolders = useMemo(() => flattenFolders(tree), [tree, flattenFolders]);

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="border-tech-main/40 hover:bg-tech-main cursor-pointer border px-3 py-1.5 font-mono text-[11px] transition-colors hover:text-white"
        >
          + NEW DIR / FILE
        </button>
      </div>

      {tree.length === 0 ? (
        <div className="text-tech-main/40 mt-4 font-mono text-sm">SYS.DIR_TREE_EMPTY</div>
      ) : (
        <div className="-ml-4">{renderTree(tree)}</div>
      )}

      {isModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 duration-300">
          <div className="border-tech-main w-full max-w-md rounded border-2 bg-white p-6 shadow-[8px_8px_0_0_rgba(var(--tech-main),1)] dark:bg-black">
            <h3 className="text-tech-main border-tech-main/20 mb-6 border-b pb-2 font-mono text-lg font-bold tracking-widest uppercase">
              CREATE_SYS_OBJECT
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 font-mono">
              <div>
                <label className="text-tech-main/80 mb-1 block text-[11px] tracking-wider uppercase">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-tech-main/5 border-tech-main/40 focus:border-tech-main text-tech-main w-full border px-3 py-2 text-sm outline-none"
                  placeholder="e.g. Overview"
                />
              </div>

              <div>
                <label className="text-tech-main/80 mb-1 block text-[11px] tracking-wider uppercase">
                  Slug (URL path)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="bg-tech-main/5 border-tech-main/40 focus:border-tech-main text-tech-main w-full border px-3 py-2 text-sm outline-none"
                  placeholder="Leave empty to auto-generate"
                />
              </div>

              <div className="bg-tech-main/5 border-tech-main/20 flex items-center gap-3 border px-3 py-2">
                <input
                  type="checkbox"
                  id="isFolder"
                  checked={formData.isFolder}
                  onChange={(e) => setFormData({ ...formData, isFolder: e.target.checked })}
                  className="accent-tech-main h-4 w-4"
                />
                <label
                  htmlFor="isFolder"
                  className="text-tech-main/80 cursor-pointer text-sm select-none"
                >
                  Create as Directory (Folder)
                </label>
              </div>

              <div>
                <label className="text-tech-main/80 mb-1 block text-[11px] tracking-wider uppercase">
                  Parent Directory
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="bg-tech-main/5 border-tech-main/40 text-tech-main w-full border px-3 py-2 text-sm outline-none"
                >
                  <option value="">[ ROOT_DIRECTORY ]</option>
                  {availableFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-tech-main/20 mt-6 flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border-tech-main/40 text-tech-main hover:bg-tech-main/10 cursor-pointer border px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-colors"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="bg-tech-main cursor-pointer px-4 py-2 text-[11px] font-bold tracking-widest text-white uppercase shadow-[2px_2px_0_0_rgba(var(--tech-main),0.4)] transition-opacity hover:opacity-90"
                >
                  EXECUTE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
