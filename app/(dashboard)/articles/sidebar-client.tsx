/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 瀹氫箟 H2 鏍囬鐨勬暟鎹粨鏋?
interface TocItem {
  id: string;
  text: string;
}

// 娓叉煋鍗曚釜瀵艰埅閾炬帴锛屽苟鍦ㄦ涓嬫柟鎸傝浇瀵瑰簲鐨勫瓙鏍囬
function SidebarLink({ href, children, activeToc }: { href?: string; children: React.ReactNode; activeToc: TocItem[] }) {
  const pathname = usePathname();
  
  if (!href) return <span>{children}</span>;

  let cleanHref = href;
  if (cleanHref.startsWith("./")) {
    cleanHref = cleanHref.slice(2);
  }
  if (cleanHref === "") {
    cleanHref = "README.md";
  }
  if (!cleanHref.endsWith(".md") && !cleanHref.includes("404") && cleanHref !== "README.md") {
    if (!cleanHref.includes(".")) {
      cleanHref += ".md";
    }
  }

  const route = `/articles/${cleanHref}`;
  // 鍒ゆ柇褰撳墠閾炬帴鏄惁鏄鍦ㄩ槄璇荤殑鏂囩珷
  const decodedPathname = decodeURIComponent(pathname);
  const decodedRoute = decodeURIComponent(route);
  const isActive = decodedPathname === decodedRoute || decodedPathname === `${decodedRoute}/`;

  return (
    <div className="relative">
      <Link 
        href={route} 
        className={`group relative text-[15px] md:text-base font-mono transition-colors block py-1.5 pl-4 -ml-4 ${isActive ? 'text-tech-main' : 'text-slate-700 hover:text-tech-main'}`}
      >
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 transition-opacity text-xs md:text-sm ${isActive ? 'opacity-100 text-tech-main' : 'opacity-0 group-hover:opacity-100 text-tech-main'}`}>&gt;</span>
        <span className={`border-b pb-[1px] ${isActive ? 'border-tech-main/50' : 'border-transparent group-hover:border-tech-main/30'}`}>{children}</span>
      </Link>
      
      {/* 浠呭湪褰撳墠鏂囩珷涓嬪睍寮€鍏?H2 浜岀骇鏍囬鏍?*/}
      {isActive && activeToc.length > 0 && (
        <ul className="pl-4 mt-1 mb-2 space-y-2 border-l border-tech-main/20 ml-1 animate-in slide-in-from-top-2 fade-in duration-300">
          {activeToc.map((h2) => (
            <li key={h2.id} className="text-[13px] md:text-sm text-tech-main/70 hover:text-tech-main transition-colors relative before:content-[''] before:w-2 before:h-[1px] before:bg-tech-main/30 before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2">
              <Link href={`#${h2.id}`} className="block break-words">
                {h2.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SidebarClient({ content }: { content: string }) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // 鐩戝惉璺敱鍙樺寲鍚庯紝鎶撳彇涓诲共 DOM 涓殑 h2
    // 璁剧疆涓€涓皬寤舵椂锛岀‘淇?react-markdown 鍜?rehype-slug 宸茬粡瀹屾垚浜?DOM 鑺傜偣鐨勬寕杞?
    const timer = setTimeout(() => {
      const headings = document.querySelectorAll("main h2");
      const tocItems: TocItem[] = [];
      headings.forEach((heading) => {
        if (heading.id && heading.textContent) {
          tocItems.push({
            id: heading.id,
            text: heading.textContent.replace(/^#\s*/, ""), // 娓呯悊鍝堝笇鏍囧織
          });
        }
      });
      setToc(tocItems);
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <ReactMarkdown
      components={({
        wtucolor: ({ node, ...props }: any) => <span style={{ color: 'red' }} {...props} />,
        ttcolor: ({ node, ...props }: any) => <span style={{ color: '#ff7300' }} {...props} />,
        ctcolor: ({ node, ...props }: any) => <span style={{ color: '#ffae00' }} {...props} />,
        becolor: ({ node, ...props }: any) => <span style={{ color: 'green' }} {...props} />,
        eucolor: ({ node, ...props }: any) => <span style={{ color: 'blue' }} {...props} />,
        tecolor: ({ node, ...props }: any) => <span style={{ color: 'blueviolet' }} {...props} />,
        atcolor: ({ node, ...props }: any) => <span style={{ color: 'purple' }} {...props} />,
        heightlightnormal: ({ node, ...props }: any) => <span style={{ color: 'chartreuse' }} {...props} />,
        heightlightwarning: ({ node, ...props }: any) => <span style={{ color: 'crimson' }} {...props} />,
        heightlightadvanced: ({ node, ...props }: any) => <span style={{ color: 'darkseagreen' }} {...props} />,
        nc: ({ node, ...props }: any) => <span {...props} />,
        hidden: ({ node, ...props }: any) => <span style={{ display: 'none' }} {...props} />,
        a: ({ node, ...props }: any) => <SidebarLink href={props.href} activeToc={toc}>{props.children}</SidebarLink>,
        hr: () => <hr className="my-6 border-t border-tech-main/10" />,
        p: ({ node, ...props }: any) => <div className="font-mono text-[13px] md:text-sm font-bold uppercase text-tech-main/70 mt-6 mb-3 tracking-widest">{props.children}</div>,
      } as any)}
    >
      {content}
    </ReactMarkdown>
  );
}

