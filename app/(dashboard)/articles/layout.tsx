import * as React from "react";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { SidebarClient } from "./sidebar-client";

export default async function ArticlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarPath = path.join(process.cwd(), "assets", "_sidebar.md");
  let sidebarContent = "";
  try {
    sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
  } catch (error) {
    sidebarContent = "Sidebar not found.";
  }

  return (
    <div className="max-w-full mx-auto flex flex-col md:flex-row relative min-h-[calc(100vh-8rem)]">
      {/* 渚ц竟鏍忥細Docsify椋庢牸锛岀Щ闄ゆ墍鏈夊崱鐗囨劅锛岀函鍑€杈规 */}
      <aside className="w-full md:w-64 lg:w-[300px] shrink-0 md:border-r border-tech-main/20">
        <div className="sticky top-[80px] sm:top-[104px] lg:top-[112px] hover:z-20 h-[calc(100vh-96px)] sm:h-[calc(100vh-128px)] lg:h-[calc(100vh-144px)] flex flex-col">
            <div className="py-4 md:py-6 pl-3 md:pl-6 pr-2 flex-1 min-h-0 text-tech-main border-b md:border-b-0 border-tech-main/20 mb-6 md:mb-0 relative group flex flex-col pt-0 md:pt-0 pl-0 md:pl-0">
            <div className="absolute left-0 top-0 w-[1px] h-0 bg-tech-main group-hover:h-full transition-all duration-1000 ease-out opacity-20 hidden md:block"></div>
            
            <div className="flex items-center justify-between mb-6 pb-2 pt-4 md:pt-8 pl-3 md:pl-6 border-b border-tech-main/20 group/title shrink-0">
              <div className="text-[11px] md:text-xs font-mono uppercase tracking-[0.2em] text-tech-main/60 font-bold flex items-center">
                <span className="w-1.5 h-1.5 bg-tech-main/60 inline-block mr-2 animate-pulse"></span>
                SYS.DIR_TREE
              </div>
              <div className="flex items-center gap-2">
                <Link href="/draft/new?file=_sidebar.md" className="hidden group-hover/title:block text-[10px] md:text-[11px] border border-tech-main/40 px-1 hover:bg-tech-main hover:text-white transition-colors">
                  EDIT
                </Link>
                <div className="text-[10px] md:text-[11px] font-mono text-tech-main/40 hidden xl:block">READ-ONLY</div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 custom-left-scrollbar h-full pl-3 md:pl-6 -mt-2"><div className="prose prose-base text-[15px] md:text-base prose-tech font-mono w-full overflow-hidden break-words [&>ul]:pl-0 [&_ul]:list-none [&_li]:mt-1.5 [&_ul_ul]:pl-3 [&_ul_ul]:border-l [&_ul_ul]:border-tech-main/20 [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 pb-8 pt-2">
              <SidebarClient content={sidebarContent} />
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


