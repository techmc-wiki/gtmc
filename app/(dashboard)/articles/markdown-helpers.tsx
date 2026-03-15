import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import Link from "next/link";
import Image from "next/image";
import path from "path";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import type { ReactNode } from "react";

type MarkdownComponentProps = {
  children?: ReactNode;
  id?: string;
  href?: string;
  src?: string;
  alt?: string;
  className?: string;
  [key: string]: unknown;
};

type MarkdownComponent = (props: MarkdownComponentProps) => ReactNode;

export function calculateReadingMetrics(content: string) {
  const cjkCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const westernWordCount = (content.match(/[a-zA-Z0-9]+/g) || []).length;
  const wordCount = cjkCount + westernWordCount;
  const readingTime = Math.max(1, Math.ceil(wordCount / 300));
  return { wordCount, readingTime };
}

export function getMarkdownComponents(rawPath: string) {
  return {
    wtucolor: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "red" }} {...props} />
    ),
    ttcolor: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "#ff7300" }} {...props} />
    ),
    ctcolor: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "#ffae00" }} {...props} />
    ),
    becolor: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "green" }} {...props} />
    ),
    eucolor: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "blue" }} {...props} />
    ),
    tecolor: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "blueviolet" }} {...props} />
    ),
    atcolor: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "purple" }} {...props} />
    ),
    heightlightnormal: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "chartreuse" }} {...props} />
    ),
    nc: ({ ...props }: MarkdownComponentProps) => <span {...props} />,
    pp: ({ ...props }: MarkdownComponentProps) => <span {...props} />,
    hidden: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ display: "none" }} {...props} />
    ),
    heightlightwarning: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "crimson" }} {...props} />
    ),
    heightlightadvanced: ({ ...props }: MarkdownComponentProps) => (
      <span style={{ color: "darkseagreen" }} {...props} />
    ),
    table: ({ ...props }: MarkdownComponentProps) => (
      <div className="w-full overflow-x-auto my-6 border border-tech-main/30 bg-white/50 backdrop-blur-sm -mx-6 sm:-mx-8 px-6 sm:px-8">
        <table
          className="w-full text-left border-collapse font-mono text-sm min-w-150"
          {...props}
        />
      </div>
    ),
    thead: ({ ...props }: MarkdownComponentProps) => (
      <thead className="bg-tech-main/10 border-b border-tech-main/30" {...props} />
    ),
    th: ({ ...props }: MarkdownComponentProps) => (
      <th
        className="p-3 font-semibold text-tech-main border-r border-tech-main/10 last:border-r-0 whitespace-nowrap"
        {...props}
      />
    ),
    td: ({ ...props }: MarkdownComponentProps) => (
      <td
        className="p-3 border-r border-t border-tech-main/10 last:border-r-0 text-slate-700"
        {...props}
      />
    ),
    h1: ({ id, children }: MarkdownComponentProps) => (
      <h1
        id={id}
        className="group relative text-2xl sm:text-3xl lg:text-4xl font-mono uppercase mt-8 mb-6 tracking-widest border-b border-tech-main/30 pb-4 text-slate-900 scroll-m-20 target:animate-target-blink target:border-tech-main"
      >
        {id && (
          <a
            href={`#${id}`}
            className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-tech-main transition-opacity text-xl font-normal no-underline"
          >
            #
          </a>
        )}
        {children}
      </h1>
    ),
    h2: ({ id, children }: MarkdownComponentProps) => (
      <h2
        id={id}
        className="group relative text-2xl font-mono uppercase mt-12 mb-6 tracking-widest text-slate-800 border-b border-tech-main/30 inline-block pr-8 scroll-m-20 target:animate-target-blink target:border-tech-main"
      >
        {id && (
          <a
            href={`#${id}`}
            className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-tech-main transition-opacity text-lg font-normal no-underline"
          >
            #
          </a>
        )}
        {children}
      </h2>
    ),
    h3: ({ id, children }: MarkdownComponentProps) => (
      <h3
        id={id}
        className="group relative text-xl font-mono uppercase mt-8 mb-4 tracking-widest text-slate-700 scroll-m-20 target:animate-target-blink"
      >
        {id && (
          <a
            href={`#${id}`}
            className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-tech-main transition-opacity text-base font-normal no-underline"
          >
            #
          </a>
        )}
        {children}
      </h3>
    ),
    p: ({ ...props }: MarkdownComponentProps) => (
      <p className="text-base leading-relaxed mb-6 font-mono text-slate-800" {...props} />
    ),
    a: ({ href: initialHref, ...props }: MarkdownComponentProps) => {
      let href = (initialHref as string) || "";
      if (href.startsWith("./") || href.startsWith("../")) {
        const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "");
        try {
          const resolved = path.join(currentDir, href).replace(/\\/g, "/");
          href = `/articles/${resolved}`;
        } catch {
          // ignore path resolution errors
        }
      } else if (!href.startsWith("http") && !href.startsWith("#") && !href.startsWith("/")) {
        const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "");
        const resolved = path.join(currentDir, href).replace(/\\/g, "/");
        href = `/articles/${resolved}`;
      }
      return (
        <Link
          href={href}
          className="text-tech-main border-b border-tech-main/50 font-mono hover:text-white hover:bg-tech-main/80 transition-colors"
          {...props}
        />
      );
    },
    ul: ({ ...props }: MarkdownComponentProps) => (
      <ul
        className="list-none pl-6 mb-6 space-y-2 font-mono border-l border-tech-main/30 text-slate-800"
        {...props}
      />
    ),
    ol: ({ ...props }: MarkdownComponentProps) => (
      <ol className="list-decimal pl-6 mb-6 space-y-2 font-mono text-slate-800" {...props} />
    ),
    li: ({ ...props }: MarkdownComponentProps) => (
      <li
        className="relative before:content-['>'] before:absolute before:-left-6 before:text-tech-main/50 text-slate-800"
        {...props}
      />
    ),
    blockquote: ({ ...props }: MarkdownComponentProps) => (
      <blockquote
        className="border-l-2 border-tech-main bg-tech-main/5 p-4 mb-6 italic font-mono text-slate-700"
        {...props}
      />
    ),
    img: ({ src: initialSrc, alt }: MarkdownComponentProps) => {
      let src = (initialSrc as string) || "";
      if (
        src.startsWith("./") ||
        src.startsWith("../") ||
        (!src.startsWith("http") && !src.startsWith("/"))
      ) {
        const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "");
        const resolved = path.join(currentDir, src).replace(/\\/g, "/");
        src = `/api/assets?path=${encodeURIComponent(resolved)}`;
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={(alt as string) || ""}
          className="max-w-full h-auto border border-tech-main/30 p-1 bg-tech-main/5 my-8 shadow-sm"
        />
      );
    },
    code: ({ className, children, ...props }: MarkdownComponentProps) => {
      const match = /language-(\w+)/.exec((className as string) || "");
      return match ? (
        <div className="my-6 border border-tech-main/30 font-mono text-sm max-w-full overflow-hidden bg-[#1e1e1e] shadow-sm -mx-6 sm:-mx-8">
          <div className="bg-tech-main/10 text-tech-main px-4 py-1 text-xs font-mono uppercase tracking-widest flex justify-between items-center border-b border-tech-main/30">
            <span>{match[1]}</span>
            <span className="opacity-50">{"//"} EXECUTABLE_BLOCK</span>
          </div>
          <div className="overflow-x-auto">
            <div className="px-6 sm:px-8">
              <SyntaxHighlighter
                style={vscDarkPlus as Record<string, Record<string, string>>}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: "1rem 0",
                  background: "transparent",
                }}
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      ) : (
        <code
          className="bg-tech-main/10 px-1 py-0.5 font-mono text-[13px] text-tech-main border border-tech-main/30 rounded-none"
          {...props}
        >
          {children}
        </code>
      );
    },
  } as Record<string, MarkdownComponent>;
}

export function getPluginsForContent(content: string) {
  const remarkPlugins: Array<typeof remarkGfm | typeof remarkMath | typeof remarkBreaks> = [
    remarkGfm,
    remarkBreaks,
  ];
  const rehypePlugins: Array<typeof rehypeRaw | typeof rehypeKatex | typeof rehypeSlug> = [
    rehypeRaw,
    rehypeSlug,
  ];

  if (content.includes("$") || content.includes("\\(") || content.includes("\\[")) {
    remarkPlugins.push(remarkMath);
    rehypePlugins.push(rehypeKatex);
  }

  return { remarkPlugins, rehypePlugins };
}
