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

export function calculateReadingMetrics(content: string) {
  const cjkCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const westernWordCount = (content.match(/[a-zA-Z0-9]+/g) || []).length;
  const wordCount = cjkCount + westernWordCount;
  const readingTime = Math.max(1, Math.ceil(wordCount / 300));
  return { wordCount, readingTime };
}

export function getMarkdownComponents(rawPath: string) {
  return {
    wtucolor: ({ node, ...props }: any) => <span style={{ color: "red" }} {...props} />,
    ttcolor: ({ node, ...props }: any) => <span style={{ color: "#ff7300" }} {...props} />,
    ctcolor: ({ node, ...props }: any) => <span style={{ color: "#ffae00" }} {...props} />,
    becolor: ({ node, ...props }: any) => <span style={{ color: "green" }} {...props} />,
    eucolor: ({ node, ...props }: any) => <span style={{ color: "blue" }} {...props} />,
    tecolor: ({ node, ...props }: any) => <span style={{ color: "blueviolet" }} {...props} />,
    atcolor: ({ node, ...props }: any) => <span style={{ color: "purple" }} {...props} />,
    heightlightnormal: ({ node, ...props }: any) => (
      <span style={{ color: "chartreuse" }} {...props} />
    ),
    nc: ({ node, ...props }: any) => <span {...props} />,
    hidden: ({ node, ...props }: any) => <span style={{ display: "none" }} {...props} />,
    heightlightwarning: ({ node, ...props }: any) => (
      <span style={{ color: "crimson" }} {...props} />
    ),
    heightlightadvanced: ({ node, ...props }: any) => (
      <span style={{ color: "darkseagreen" }} {...props} />
    ),
    table: ({ node, ...props }: any) => (
      <div className="w-full overflow-x-auto my-6 border border-tech-main/30 bg-white/50 backdrop-blur-sm">
        <table
          className="w-full text-left border-collapse font-mono text-sm min-w-150"
          {...props}
        />
      </div>
    ),
    thead: ({ node, ...props }: any) => (
      <thead className="bg-tech-main/10 border-b border-tech-main/30" {...props} />
    ),
    th: ({ node, ...props }: any) => (
      <th
        className="p-3 font-semibold text-tech-main border-r border-tech-main/10 last:border-r-0 whitespace-nowrap"
        {...props}
      />
    ),
    td: ({ node, ...props }: any) => (
      <td
        className="p-3 border-r border-t border-tech-main/10 last:border-r-0 text-slate-700"
        {...props}
      />
    ),
    h1: ({ node, ...props }: any) => (
      <h1
        id={props.id}
        className="group relative text-3xl lg:text-4xl font-mono uppercase mt-8 mb-6 tracking-widest border-b border-tech-main/30 pb-4 text-slate-900 scroll-m-20 target:animate-target-blink target:border-tech-main"
      >
        {props.id && (
          <a
            href={`#${props.id}`}
            className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-tech-main transition-opacity text-xl font-normal no-underline"
          >
            #
          </a>
        )}
        {props.children}
      </h1>
    ),
    h2: ({ node, ...props }: any) => (
      <h2
        id={props.id}
        className="group relative text-2xl font-mono uppercase mt-12 mb-6 tracking-widest text-slate-800 border-b border-tech-main/30 inline-block pr-8 scroll-m-20 target:animate-target-blink target:border-tech-main"
      >
        {props.id && (
          <a
            href={`#${props.id}`}
            className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-tech-main transition-opacity text-lg font-normal no-underline"
          >
            #
          </a>
        )}
        {props.children}
      </h2>
    ),
    h3: ({ node, ...props }: any) => (
      <h3
        id={props.id}
        className="group relative text-xl font-mono uppercase mt-8 mb-4 tracking-widest text-slate-700 scroll-m-20 target:animate-target-blink"
      >
        {props.id && (
          <a
            href={`#${props.id}`}
            className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-tech-main transition-opacity text-base font-normal no-underline"
          >
            #
          </a>
        )}
        {props.children}
      </h3>
    ),
    p: ({ node, ...props }: any) => (
      <p className="text-base leading-relaxed mb-6 font-mono text-slate-800" {...props} />
    ),
    a: ({ node, ...props }: any) => {
      let href = props.href || "";
      if (href.startsWith("./") || href.startsWith("../")) {
        const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "");
        try {
          const resolved = path.join(currentDir, href).replace(/\\/g, "/");
          href = `/articles/${resolved}`;
        } catch (e) {}
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
    ul: ({ node, ...props }: any) => (
      <ul
        className="list-none pl-6 mb-6 space-y-2 font-mono border-l border-tech-main/30 text-slate-800"
        {...props}
      />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className="list-decimal pl-6 mb-6 space-y-2 font-mono text-slate-800" {...props} />
    ),
    li: ({ node, ...props }: any) => (
      <li
        className="relative before:content-['>'] before:absolute before:-left-6 before:text-tech-main/50 text-slate-800"
        {...props}
      />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote
        className="border-l-2 border-tech-main bg-tech-main/5 p-4 mb-6 italic font-mono text-slate-700"
        {...props}
      />
    ),
    img: ({ node, ...props }: any) => {
      let src = (props.src as string) || "";
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
        <Image
          src={src}
          alt={props.alt || ""}
          className="max-w-full h-auto border border-tech-main/30 p-1 bg-tech-main/5 my-8 shadow-sm"
        />
      );
    },
    code: ({ node, className, children, ref, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      return match ? (
        <div className="my-6 border border-tech-main/30 font-mono text-sm max-w-full overflow-hidden bg-[#1e1e1e] shadow-sm">
          <div className="bg-tech-main/10 text-tech-main px-4 py-1 text-xs font-mono uppercase tracking-widest flex justify-between items-center border-b border-tech-main/30">
            <span>{match[1]}</span>
            <span className="opacity-50">{"//"} EXECUTABLE_BLOCK</span>
          </div>
          <div className="overflow-x-auto">
            <SyntaxHighlighter
              style={vscDarkPlus as any}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: "1rem",
                background: "transparent",
              }}
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
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
  } as any;
}

export function getPluginsForContent(content: string) {
  const remarkPlugins: any[] = [remarkGfm, remarkBreaks];
  const rehypePlugins: any[] = [rehypeRaw, rehypeSlug];

  if (content.includes("$") || content.includes("\\(") || content.includes("\\[")) {
    remarkPlugins.push(remarkMath);
    rehypePlugins.push(rehypeKatex);
  }

  return { remarkPlugins, rehypePlugins };
}
