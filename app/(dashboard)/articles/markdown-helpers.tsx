import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import Link from "next/link"
import path from "path"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"
import type { ReactNode } from "react"

type MarkdownComponentProps = {
  children?: ReactNode
  id?: string
  href?: string
  src?: string
  alt?: string
  className?: string
  [key: string]: unknown
}

type MarkdownComponent = (props: MarkdownComponentProps) => ReactNode

export function calculateReadingMetrics(content: string) {
  const cjkCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const westernWordCount = (content.match(/[a-zA-Z0-9]+/g) || [])
    .length
  const wordCount = cjkCount + westernWordCount
  const readingTime = Math.max(1, Math.ceil(wordCount / 300))
  return { wordCount, readingTime }
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
      <div className="
        -mx-6 my-6 w-full overflow-x-auto border border-tech-main/30 bg-white/50
        px-6 backdrop-blur-sm
        sm:-mx-8 sm:px-8
      ">
        <table
          className="
            w-full min-w-150 border-collapse text-left font-mono text-sm
          "
          {...props}
        />
      </div>
    ),
    thead: ({ ...props }: MarkdownComponentProps) => (
      <thead
        className="border-b border-tech-main/30 bg-tech-main/10"
        {...props}
      />
    ),
    th: ({ ...props }: MarkdownComponentProps) => (
      <th
        className="
          border-r border-tech-main/10 p-3 font-semibold whitespace-nowrap
          text-tech-main
          last:border-r-0
        "
        {...props}
      />
    ),
    td: ({ ...props }: MarkdownComponentProps) => (
      <td
        className="
          border-t border-r border-tech-main/10 p-3 text-slate-700
          last:border-r-0
        "
        {...props}
      />
    ),
    h1: ({ id, children }: MarkdownComponentProps) => (
      <h1
        id={id}
        className="
          group relative mt-8 mb-6 scroll-m-20 border-b border-tech-main/30 pb-4
          font-mono text-2xl tracking-widest text-slate-900 uppercase
          target:animate-target-blink target:border-tech-main
          sm:text-3xl
          lg:text-4xl
        ">
        {id && (
          <a
            href={`#${id}`}
            className="
              absolute top-1/2 -left-6 -translate-y-1/2 text-xl font-normal
              text-tech-main no-underline opacity-0 transition-opacity
              group-hover:opacity-100
            ">
            #
          </a>
        )}
        {children}
      </h1>
    ),
    h2: ({ id, children }: MarkdownComponentProps) => (
      <h2
        id={id}
        className="
          group relative mt-12 mb-6 inline-block scroll-m-20 border-b
          border-tech-main/30 pr-8 font-mono text-2xl tracking-widest
          text-slate-800 uppercase
          target:animate-target-blink target:border-tech-main
        ">
        {id && (
          <a
            href={`#${id}`}
            className="
              absolute top-1/2 -left-5 -translate-y-1/2 text-lg font-normal
              text-tech-main no-underline opacity-0 transition-opacity
              group-hover:opacity-100
            ">
            #
          </a>
        )}
        {children}
      </h2>
    ),
    h3: ({ id, children }: MarkdownComponentProps) => (
      <h3
        id={id}
        className="
          group relative mt-8 mb-4 scroll-m-20 font-mono text-xl tracking-widest
          text-slate-700 uppercase
          target:animate-target-blink
        ">
        {id && (
          <a
            href={`#${id}`}
            className="
              absolute top-1/2 -left-4 -translate-y-1/2 text-base font-normal
              text-tech-main no-underline opacity-0 transition-opacity
              group-hover:opacity-100
            ">
            #
          </a>
        )}
        {children}
      </h3>
    ),
    p: ({ ...props }: MarkdownComponentProps) => (
      <p
        className="mb-4 font-mono text-base/relaxed text-slate-800"
        {...props}
      />
    ),
    a: ({ href: initialHref, ...props }: MarkdownComponentProps) => {
      let href = (initialHref as string) || ""
      if (href.startsWith("./") || href.startsWith("../")) {
        const currentDir = path
          .dirname("/" + rawPath)
          .replace(/^\/+/, "")
        try {
          const resolved = path
            .join(currentDir, href)
            .replace(/\\/g, "/")
          href = `/articles/${resolved}`
        } catch {
          // ignore path resolution errors
        }
      } else if (
        !href.startsWith("http") &&
        !href.startsWith("#") &&
        !href.startsWith("/")
      ) {
        const currentDir = path
          .dirname("/" + rawPath)
          .replace(/^\/+/, "")
        const resolved = path
          .join(currentDir, href)
          .replace(/\\/g, "/")
        href = `/articles/${resolved}`
      }
      return (
        <Link
          href={href}
          className="
            border-b border-tech-main/50 font-mono text-tech-main
            transition-colors
            hover:bg-tech-main/80 hover:text-white
          "
          {...props}
        />
      )
    },
    ul: ({ ...props }: MarkdownComponentProps) => (
      <ul
        className="
          mb-6 list-none space-y-2 border-l-[1.5] border-tech-main/30 pl-8
          font-mono text-[0.9em] text-slate-800
        "
        {...props}
      />
    ),
    ol: ({ ...props }: MarkdownComponentProps) => (
      <ol
        className="mb-6 list-decimal space-y-2 pl-6 font-mono text-slate-800"
        {...props}
      />
    ),
    li: ({ ...props }: MarkdownComponentProps) => (
      <li
        className="
          relative text-slate-800
          before:absolute before:-left-4 before:text-tech-main/50
          before:content-['>']
        "
        {...props}
      />
    ),
    blockquote: ({ ...props }: MarkdownComponentProps) => (
      <blockquote
        className="
          mb-6 border-l-2 border-tech-main bg-tech-main/5 p-4 pb-[0.01]
          font-mono text-slate-700 italic
        "
        {...props}
      />
    ),
    img: ({ src: initialSrc, alt }: MarkdownComponentProps) => {
      let src = (initialSrc as string) || ""
      if (
        src.startsWith("./") ||
        src.startsWith("../") ||
        (!src.startsWith("http") && !src.startsWith("/"))
      ) {
        const currentDir = path
          .dirname("/" + rawPath)
          .replace(/^\/+/, "")
        const resolved = path
          .join(currentDir, src)
          .replace(/\\/g, "/")
        src = `/api/assets?path=${encodeURIComponent(resolved)}`
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={(alt as string) || ""}
          className="
            my-8 h-auto max-w-full border border-tech-main/30 bg-tech-main/5 p-1
            shadow-sm
          "
        />
      )
    },
    code: ({
      className,
      children,
      ...props
    }: MarkdownComponentProps) => {
      const match = /language-(\w+)/.exec((className as string) || "")
      return match ? (
        <div className="
          -mx-6 my-6 max-w-full overflow-hidden border border-tech-main/30
          bg-[#1e1e1e] font-mono text-sm shadow-sm
          sm:-mx-8
        ">
          <div className="
            flex items-center justify-between border-b border-tech-main/30
            bg-tech-main/10 px-4 py-1 font-mono text-xs tracking-widest
            text-tech-main uppercase
          ">
            <span>{match[1]}</span>
            <span className="opacity-50">
              {"//"} EXECUTABLE_BLOCK
            </span>
          </div>
          <div className="
            overflow-x-scroll px-4
            sm:px-6
          ">
            <div className="
              px-6
              sm:px-8
            ">
              <SyntaxHighlighter
                style={
                  vscDarkPlus as Record<
                    string,
                    Record<string, string>
                  >
                }
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: "1rem 0",
                  background: "transparent",
                }}
                {...props}>
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      ) : (
        <code
          className="
            mx-1 rounded-none border border-tech-main/30 bg-tech-main/10 px-1
            py-[0.05rem] font-mono text-[0.8em] text-tech-main
          "
          {...props}>
          {children}
        </code>
      )
    },
  } as Record<string, MarkdownComponent>
}

export function getPluginsForContent(content: string) {
  const remarkPlugins: Array<
    typeof remarkGfm | typeof remarkMath | typeof remarkBreaks
  > = [remarkGfm, remarkBreaks]
  const rehypePlugins: Array<
    typeof rehypeRaw | typeof rehypeKatex | typeof rehypeSlug
  > = [rehypeRaw, rehypeSlug]

  if (
    content.includes("$") ||
    content.includes("\\(") ||
    content.includes("\\[")
  ) {
    remarkPlugins.push(remarkMath)
    rehypePlugins.push(rehypeKatex)
  }

  return { remarkPlugins, rehypePlugins }
}
