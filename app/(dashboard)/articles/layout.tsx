"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarClient } from "./sidebar-client";
import { getSidebarTree } from "@/actions/sidebar";

interface ArticlesLayoutProps {
  children: React.ReactNode;
  tree: any[];
}

function ArticlesLayoutClient({ children, tree }: ArticlesLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="max-w-full mx-auto flex flex-col md:flex-row relative min-h-[calc(100vh-8rem)]">
      {/* Mobile toggle button */}
      <div className="md:hidden flex items-center border-b border-tech-main/20 bg-white/50 backdrop-blur-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center px-4 text-tech-main hover:bg-tech-main/5 transition-colors"
          aria-label="Toggle article tree"
          aria-expanded={isOpen}
        >
          <span className="text-sm font-mono font-bold">{isOpen ? "▼" : "▶"} TREE</span>
        </button>
      </div>

      {/* Mobile collapsible drawer */}
      <aside
        className="md:hidden overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: isOpen ? "100vh" : "0px" }}
      >
        <div className="bg-white/50 backdrop-blur-sm border-b border-tech-main/20 p-4">
          <div className="prose prose-base text-[15px] prose-tech font-mono w-full overflow-hidden wrap-break-word [&>ul]:pl-0 [&_ul]:list-none [&_li]:mt-1.5 [&_ul_ul]:pl-3 [&_ul_ul]:border-l [&_ul_ul]:border-tech-main/20 [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 pb-4">
            <SidebarClient tree={tree} />
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 lg:w-75 shrink-0 border-r border-tech-main/20">
        <div className="sticky top-20 sm:top-26 lg:top-28 hover:z-20 h-[calc(100vh-96px)] sm:h-[calc(100vh-128px)] lg:h-[calc(100vh-144px)] flex flex-col">
          <div className="py-4 md:py-6 pr-2 flex-1 min-h-0 text-tech-main border-b border-tech-main/20 relative group flex flex-col pl-0 md:pl-0">
            <div className="absolute left-0 top-0 w-px h-0 bg-tech-main group-hover:h-full transition-all duration-1000 ease-out opacity-20"></div>

            <div className="flex items-center justify-between mb-6 pb-2 pt-8 pl-6 border-b border-tech-main/20 group/title shrink-0">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-tech-main/60 font-bold flex items-center">
                <span className="w-1.5 h-1.5 bg-tech-main/60 inline-block mr-2 animate-pulse"></span>
                SYS.DIR_TREE
              </div>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 custom-left-scrollbar h-full pl-6 -mt-2">
              <div className="prose prose-base text-base prose-tech font-mono w-full overflow-hidden wrap-break-word [&>ul]:pl-0 [&_ul]:list-none [&_li]:mt-1.5 [&_ul_ul]:pl-3 [&_ul_ul]:border-l [&_ul_ul]:border-tech-main/20 [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 pb-8 pt-2">
                <SidebarClient tree={tree} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 md:pl-10 lg:pl-16 py-6 border-l border-transparent overflow-x-hidden relative">
        {children}
      </main>
    </div>
  );
}

export default async function ArticlesLayout({ children }: { children: React.ReactNode }) {
  const tree = await getSidebarTree();

  return <ArticlesLayoutClient tree={tree}>{children}</ArticlesLayoutClient>;
}
