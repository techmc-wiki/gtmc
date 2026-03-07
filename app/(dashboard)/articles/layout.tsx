import * as React from "react";
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { BrutalCard } from "@/components/ui/brutal-card";

function SidebarLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <span>{children}</span>;

  // Clean the href
  let cleanHref = href;
  if (cleanHref.startsWith("./")) {
    cleanHref = cleanHref.slice(2);
  }
  if (cleanHref === "") {
    cleanHref = "README.md";
  }
  if (!cleanHref.endsWith(".md") && !cleanHref.includes("404") && cleanHref !== "README.md") {
    // some links like 02-litematica might not have .md
    if (!cleanHref.includes(".")) {
      cleanHref += ".md";
    }
  }

  // Remove .md for routing if we want cleaner URLs, but since file names map directly it's easier to keep them or encode them.
  // Actually, we can encode the uri component to handle chinese characters in the URL
  const route = `/articles/${cleanHref}`;

  return (
    <Link 
      href={route} 
      className="text-sm font-mono hover:text-tech-main transition-colors block py-1 border-l border-transparent hover:border-tech-main/50 hover:bg-tech-main/5 pl-2 -ml-2 text-tech-main-dark"
    >
      {children}
    </Link>
  );
}

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
    <div className="max-w-[1400px] mx-auto p-4 sm:p-8 flex flex-col md:flex-row gap-8 relative">
      <aside className="w-full md:w-64 lg:w-80 shrink-0">
        <div className="sticky top-24">
          <BrutalCard className="h-[calc(100vh-8rem)] flex flex-col !p-0">
            <div className="p-6 overflow-y-auto flex-1 text-tech-main">
              <div className="text-sm font-mono uppercase tracking-[0.2em] mb-4 border-b border-tech-main/30 pb-2 text-tech-main">
                INDEX
              </div>
              <div className="prose prose-sm prose-tech font-mono w-full overflow-hidden break-words [&>ul]:pl-0 [&_ul]:list-none [&_li]:mt-1 [&_ul_ul]:pl-4 [&_ul_ul]:border-l [&_ul_ul]:border-tech-main/20 [&_ul_ul]:mt-1 [&_ul_ul]:mb-2">
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => <SidebarLink href={props.href}>{props.children}</SidebarLink>,
                    hr: () => <hr className="my-4 border-t border-tech-main/20" />,
                    p: ({ node, ...props }) => <div className="font-mono text-[10px] uppercase text-tech-main/50 mt-4 mb-2 tracking-widest">{props.children}</div>,
                  }}
                >
                  {sidebarContent}
                </ReactMarkdown>
              </div>
            </div>
          </BrutalCard>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
