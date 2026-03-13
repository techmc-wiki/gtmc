"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createDocument } from "@/actions/sidebar";

// 定义 H2 标题的数据结构
interface TocItem {
  id: string;
  text: string;
}

export function SidebarClient({ tree }: { tree: any[] }) {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: "",
    slug: "",
    isFolder: false,
    parentId: "",
  });

  const [toc, setToc] = useState<TocItem[]>([]);

  useEffect(() => {
    // 监听路由变化后，抓取主干 DOM 中的 h2
    // 设置一个小延时，确保页面完成挂载
    const timer = setTimeout(() => {
      const headings = document.querySelectorAll("main h2");
      const tocItems: TocItem[] = [];
      headings.forEach((heading) => {
        if (heading.id && heading.textContent) {
          tocItems.push({
            id: heading.id,
            text: heading.textContent.replace(/^#\s*/, ""), // 清理哈希标志
          });
        }
      });
      setToc(tocItems);
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDocument({
        title: formData.title,
        slug:
          formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-"),
        isFolder: formData.isFolder,
        parentId: formData.parentId || null,
      });
      setIsModalOpen(false);
      window.location.reload(); // Simple refresh to update sidebar
    } catch (error: any) {
      alert(error.message);
    }
  };

  const renderTree = (items: any[]) => {
    return (
      <ul className="pl-4 border-l border-tech-main/20 my-1">
        {items.map((item) => {
          const fileRoute = `/articles/${item.slug}`;
          const decodedPathname = decodeURIComponent(pathname);
          const decodedRoute = decodeURIComponent(fileRoute);
          const isActive =
            !item.isFolder &&
            (decodedPathname === decodedRoute ||
              decodedPathname === `${decodedRoute}/`);

          return (
            <li
              key={item.id}
              className="my-1.5 text-[15px] md:text-base font-mono list-none"
            >
              {item.isFolder ? (
                <span className="text-tech-main/80 font-bold opacity-80 uppercase block mt-3 mb-1">
                  ► {item.title}
                </span>
              ) : (
                <div className="relative">
                  <Link
                    href={fileRoute}
                    className={`group relative transition-colors block py-1.5 pl-4 -ml-4 ${isActive ? "text-tech-main font-bold" : "text-slate-700 hover:text-tech-main"}`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 transition-opacity text-xs md:text-sm ${isActive ? "opacity-100 text-tech-main" : "opacity-0 group-hover:opacity-100 text-tech-main"}`}
                    >
                      &gt;
                    </span>
                    <span
                      className={`border-b pb-[1px] ${isActive ? "border-tech-main/50" : "border-transparent group-hover:border-tech-main/30"}`}
                    >
                      {item.title}
                    </span>
                  </Link>
                  {/* 二级标题展开 */}
                  {isActive && toc.length > 0 && (
                    <ul className="pl-4 mt-1 mb-2 space-y-2 border-l border-tech-main/20 ml-1 animate-in slide-in-from-top-2 fade-in duration-300">
                      {toc.map((h2) => (
                        <li
                          key={h2.id}
                          className="text-[13px] md:text-sm text-tech-main/70 hover:text-tech-main transition-colors relative before:content-[''] before:w-2 before:h-[1px] before:bg-tech-main/30 before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2"
                        >
                          <Link
                            href={`#${h2.id}`}
                            className="block break-words"
                          >
                            {h2.text}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {item.children &&
                item.children.length > 0 &&
                renderTree(item.children)}
            </li>
          );
        })}
      </ul>
    );
  };

  const flattenFolders = (items: any[]): any[] => {
    let folders: any[] = [];
    items.forEach((item) => {
      if (item.isFolder) {
        folders.push(item);
        if (item.children)
          folders = [...folders, ...flattenFolders(item.children)];
      }
    });
    return folders;
  };

  const availableFolders = flattenFolders(tree);

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-[11px] font-mono border border-tech-main/40 px-3 py-1.5 hover:bg-tech-main hover:text-white transition-colors"
        >
          + NEW DIR / FILE
        </button>
      </div>

      {tree.length === 0 ? (
        <div className="text-tech-main/40 text-sm font-mono mt-4">
          SYS.DIR_TREE_EMPTY
        </div>
      ) : (
        <div className="-ml-4">{renderTree(tree)}</div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-black border-2 border-tech-main p-6 max-w-md w-full rounded shadow-[8px_8px_0_0_rgba(var(--tech-main),1)]">
            <h3 className="text-lg font-bold font-mono text-tech-main mb-6 uppercase tracking-[0.1em] border-b border-tech-main/20 pb-2">
              CREATE_SYS_OBJECT
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 font-mono">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-tech-main/80 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full bg-tech-main/5 border border-tech-main/40 px-3 py-2 outline-none focus:border-tech-main text-tech-main text-sm"
                  placeholder="e.g. Overview"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-tech-main/80 mb-1">
                  Slug (URL path)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full bg-tech-main/5 border border-tech-main/40 px-3 py-2 outline-none focus:border-tech-main text-tech-main text-sm"
                  placeholder="Leave empty to auto-generate"
                />
              </div>

              <div className="flex items-center gap-3 py-2 bg-tech-main/5 px-3 border border-tech-main/20">
                <input
                  type="checkbox"
                  id="isFolder"
                  checked={formData.isFolder}
                  onChange={(e) =>
                    setFormData({ ...formData, isFolder: e.target.checked })
                  }
                  className="accent-tech-main w-4 h-4"
                />
                <label
                  htmlFor="isFolder"
                  className="text-sm text-tech-main/80 cursor-pointer select-none"
                >
                  Create as Directory (Folder)
                </label>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-tech-main/80 mb-1">
                  Parent Directory
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) =>
                    setFormData({ ...formData, parentId: e.target.value })
                  }
                  className="w-full bg-tech-main/5 border border-tech-main/40 px-3 py-2 outline-none text-tech-main text-sm"
                >
                  <option value="">[ ROOT_DIRECTORY ]</option>
                  {availableFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4 mt-6 border-t border-tech-main/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-tech-main/40 text-[11px] text-tech-main hover:bg-tech-main/10 uppercase tracking-widest transition-colors font-bold"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tech-main text-white font-bold hover:opacity-90 text-[11px] uppercase tracking-widest transition-opacity shadow-[2px_2px_0_0_rgba(var(--tech-main),0.4)]"
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
