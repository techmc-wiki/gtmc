"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { SidebarClient } from "./sidebar-client";
import { MobileTreeCard } from "./mobile-tree-card";

interface TreeNode {
  id: string;
  title: string;
  slug: string;
  isFolder: boolean;
  parentId: string | null;
  children: TreeNode[];
}

interface ArticlesLayoutProps {
  children: React.ReactNode;
  tree: TreeNode[];
}

export function ArticlesLayoutClient({ children, tree }: ArticlesLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const pathname = usePathname();
  const inlineShellRef = useRef<HTMLDivElement>(null);
  const canUseDOM = typeof document !== "undefined";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFloating(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px",
      },
    );

    if (inlineShellRef.current) {
      observer.observe(inlineShellRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const treeContent = (
    <div className="prose prose-base text-[15px] prose-tech font-mono w-full overflow-hidden wrap-break-word [&>ul]:pl-0 [&_ul]:list-none [&_li]:mt-1.5 [&_ul_ul]:pl-3 [&_ul_ul]:border-l [&_ul_ul]:border-tech-main/20 [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 pb-4">
      <SidebarClient tree={tree} onNavigate={() => setIsOpen(false)} />
    </div>
  );

  return (
    <div className="max-w-full mx-auto flex flex-col md:flex-row relative min-h-[calc(100vh-8rem)]">
      {/* Mobile inline tree shell (default state) */}
      <div
        ref={inlineShellRef}
        className="md:hidden border-b border-tech-main/40 bg-white/95 backdrop-blur-md"
        data-testid="mobile-tree-inline-shell"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full min-h-[44px] flex items-center justify-between px-4 text-tech-main hover:bg-tech-main/5 transition-colors cursor-pointer"
          aria-label="Toggle article tree"
          aria-expanded={isOpen}
          data-testid="mobile-tree-toggle"
        >
          <span className="text-xs font-mono uppercase tracking-[0.15em] font-bold">TREE</span>
          <span className="text-sm font-mono font-bold">{isOpen ? "▼" : "▶"}</span>
        </button>

        {!isFloating && isOpen ? (
          <div className="border-t border-tech-main/20 px-4 pb-4 pt-3">{treeContent}</div>
        ) : null}
      </div>

      {/* Mobile floating trigger (appears after scroll) */}
      {canUseDOM && isFloating
        ? createPortal(
            <div
              className="md:hidden fixed top-20 right-4 z-[58] flex items-center animate-tech-pop-in"
              data-testid="mobile-tree-floating-trigger"
            >
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[44px] border border-tech-main/40 bg-white/95 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-tech-main backdrop-blur-md transition-all duration-300 hover:bg-tech-main/5 cursor-pointer"
                aria-label="Toggle article tree"
                aria-expanded={isOpen}
              >
                TREE
              </button>
            </div>,
            document.body,
          )
        : null}

      {/* Mobile floating tree card */}
      <MobileTreeCard isOpen={isOpen} onClose={() => setIsOpen(false)} isFloating={isFloating}>
        {treeContent}
      </MobileTreeCard>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 lg:w-75 shrink-0 border-r border-tech-main/20">
        <div className="sticky top-20 sm:top-26 lg:top-28 hover:z-20 h-[calc(100vh-96px)] sm:h-[calc(100vh-128px)] lg:h-[calc(100vh-144px)] flex flex-col">
          <div className="py-4 md:py-6 pr-2 flex-1 min-h-0 text-tech-main border-b border-tech-main/20 relative group flex flex-col pl-0 md:pl-0">
            <div className="absolute left-0 top-0 w-px h-0 bg-tech-main group-hover:h-full transition-all duration-500 ease-out opacity-20"></div>

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

      <main className="flex-1 min-w-0 md:pl-10 lg:pl-16 py-6 border-l border-transparent overflow-x-hidden relative">
        {children}
      </main>
    </div>
  );
}
