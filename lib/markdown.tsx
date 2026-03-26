import Link from "next/link"
import path from "path"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"
import type { ReactNode } from "react"
import React from "react"
import type { Element, Root, Text } from "hast"
import { visit } from "unist-util-visit"
import { pangu } from "pangu"
import { CodeCopyButton } from "@/components/code-copy-button"
import type { createRehypeShiki } from "@/lib/rehype-shiki"

export function rehypeLinkedCode() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "a") {
        const codeChild = node.children?.some(
          (c) => c.type === "element" && (c as Element).tagName === "code"
        )
        if (codeChild) {
          node.properties = node.properties || {}
          node.properties["data-has-code"] = "true"
          node.children?.forEach((c) => {
            if (c.type === "element" && (c as Element).tagName === "code") {
              ;(c as Element).properties = (c as Element).properties || {}
              ;(c as Element).properties["data-linked-code"] = "true"
            }
          })
        }
      }
      if (node.tagName === "code") {
        const linkChild = node.children?.some(
          (c) => c.type === "element" && (c as Element).tagName === "a"
        )
        if (linkChild) {
          node.properties = node.properties || {}
          node.properties["data-has-link"] = "true"
          node.children?.forEach((c) => {
            if (c.type === "element" && (c as Element).tagName === "a") {
              ;(c as Element).properties = (c as Element).properties || {}
              ;(c as Element).properties["data-in-code"] = "true"
            }
          })
        }
      }
    })
  }
}

export function rehypeCJKSpacing() {
  return (tree: Root) => {
    visit(tree, (node, _, parent) => {
      if (node.type !== "text") return
      if (parent?.type === "element") {
        const parentTag = (parent as Element).tagName
        if (parentTag === "code" || parentTag === "pre") return
      }
      const textNode = node as Text
      textNode.value = pangu.spacingText(textNode.value)
    })
  }
}

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
  const westernWordCount = (content.match(/[a-zA-Z0-9]+/g) || []).length
  const wordCount = cjkCount + westernWordCount
  const readingTime = Math.max(1, Math.ceil(wordCount / 300))
  return { wordCount, readingTime }
}

export function getMarkdownComponents(rawPath: string) {
  function resolveHref(initialHref: string): string {
    let href = initialHref
    if (href.startsWith("./") || href.startsWith("../")) {
      const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "")
      try {
        const resolved = path.join(currentDir, href).replace(/\\/g, "/")
        href = `/articles/${resolved.split("/").map(encodeURIComponent).join("/")}`
      } catch {
        return href
      }
    } else if (
      !href.startsWith("http") &&
      !href.startsWith("#") &&
      !href.startsWith("/")
    ) {
      const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "")
      const resolved = path.join(currentDir, href).replace(/\\/g, "/")
      href = `/articles/${resolved.split("/").map(encodeURIComponent).join("/")}`
    }
    return href
  }

  function aComponent({
    href: initialHref,
    children,
    ...props
  }: MarkdownComponentProps) {
    const href = resolveHref((initialHref as string) || "")
    const hasCode = props["data-has-code"] === "true"
    const inCode = props["data-in-code"] === "true"
    if (inCode) {
      const { "data-in-code": _inCode, ...rest } = props
      return (
        <Link
          href={href}
          className="
            mx-1 inline-block border border-b-2 border-tech-main/30
            bg-tech-main/10 px-1 py-[0.05rem] font-mono text-[0.8em]
            text-tech-main transition-colors
            hover:border-tech-main hover:bg-tech-main/80 hover:text-white
          "
          {...rest}>
          {children}
        </Link>
      )
    }
    if (hasCode) {
      const { "data-has-code": _hasCode, ...rest } = props
      return (
        <Link
          href={href}
          className="group/lc font-mono text-tech-main"
          {...rest}>
          {children}
        </Link>
      )
    }
    return (
      <Link
        href={href}
        className="
          border-b border-tech-main/50 font-mono text-tech-main
          transition-colors
          hover:bg-tech-main/80 hover:text-white
        "
        {...props}>
        {children}
      </Link>
    )
  }

  function codeComponent({
    className,
    children,
    ...props
  }: MarkdownComponentProps) {
    const isLinked = props["data-linked-code"] === "true"
    const hasLink = props["data-has-link"] === "true"
    if (isLinked) {
      const { "data-linked-code": _linkedCode, ...rest } = props
      return (
        <code
          className="
            mx-1 border border-b-2 border-tech-main/30 bg-tech-main/10 px-1
            py-[0.05rem] font-mono text-[0.8em] text-tech-main not-italic
            transition-colors
            group-hover/lc:border-tech-main group-hover/lc:bg-tech-main/80
            group-hover/lc:text-white
          "
          {...rest}>
          {children}
        </code>
      )
    }
    if (hasLink) {
      const { "data-has-link": _hasLink, ...rest } = props
      return (
        <code className="font-mono text-[0.8em] not-italic" {...rest}>
          {children}
        </code>
      )
    }
    if ((className as string)?.startsWith("language-")) {
      return (
        <code className={className as string} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="
          mx-1 border border-tech-main/30 bg-tech-main/10 px-1 py-[0.05rem]
          font-mono text-[0.8em] text-tech-main not-italic
        "
        {...props}>
        {children}
      </code>
    )
  }

  function preComponent({ children, ...props }: MarkdownComponentProps) {
    const rawCode = props["data-raw-code"] as string | undefined
    if (!rawCode) return <>{children}</>

    const lang = (props["data-lang"] as string) || ""
    const lineCount = (props["data-line-count"] as string) || "0"

    return (
      <div
        className="
          relative my-6 w-full border border-tech-main/30 bg-tech-bg font-mono
          text-sm
        ">
        <div
          className="
            pointer-events-none absolute top-0 left-0 size-3 -translate-px
            border-t-2 border-l-2 border-tech-main/30
          "
        />
        <div
          className="
            pointer-events-none absolute top-0 right-0 size-3 translate-x-px
            -translate-y-px border-t-2 border-r-2 border-tech-main/30
          "
        />
        <div
          className="
            pointer-events-none absolute bottom-0 left-0 size-3 -translate-x-px
            translate-y-px border-b-2 border-l-2 border-tech-main/30
          "
        />
        <div
          className="
            pointer-events-none absolute right-0 bottom-0 size-3 translate-px
            border-r-2 border-b-2 border-tech-main/30
          "
        />
        <div
          className="
            flex items-center justify-between border-b guide-line
            bg-tech-main/10 px-4 py-1.5
          ">
          <div className="flex items-center gap-2">
            <span className="size-1.5 animate-pulse bg-tech-main/40" />
            <span className="text-xs tracking-widest text-tech-main uppercase">
              {lang}
            </span>
          </div>
          <div
            className="
              flex items-center gap-3 font-mono text-[10px] tracking-widest
              text-tech-main
            ">
            <span>{lineCount} LINES</span>
            <span className="text-tech-main/50">|</span>
            <CodeCopyButton code={rawCode} />
          </div>
        </div>
        <div className="relative">
          <div
            className="
              pointer-events-none absolute inset-0 border border-tech-main/10
            "
          />
          <div
            className="
              pointer-events-none absolute inset-x-0 top-1/4 h-px bg-tech-main/3
            "
          />
          <div
            className="
              pointer-events-none absolute inset-x-0 top-3/4 h-px bg-tech-main/3
            "
          />
          <div
            className="
              custom-bottom-scrollbar overflow-x-auto px-4
              sm:px-6
            ">
            <div className="px-0" dir="ltr">
              {children}
            </div>
          </div>
        </div>
        <div
          className="
            flex items-center justify-end border-t border-tech-main/10 px-4 py-1
          ">
          <span
            className="
              font-mono text-[9px] tracking-widest text-tech-main/50 uppercase
              select-none
            ">
            {"//"} SYNTAX_HIGHLIGHT
          </span>
        </div>
      </div>
    )
  }

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
      <div
        className="
          my-6 custom-bottom-scrollbar w-full overflow-x-auto border
          border-tech-main/30 bg-tech-bg/50 backdrop-blur-sm
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
    a: aComponent,
    ul: ({ ...props }: MarkdownComponentProps) => (
      <ul
        className="
          mb-6 list-disc space-y-2 border-l border-tech-main/30 pl-8 font-mono
          text-[14px] text-slate-800
        "
        {...props}
      />
    ),
    ol: ({ ...props }: MarkdownComponentProps) => (
      <ol
        className="
          mb-6 list-decimal space-y-2 pl-8 font-mono text-[14px] text-slate-800
        "
        {...props}
      />
    ),
    li: ({ ...props }: MarkdownComponentProps) => (
      <li className="relative text-slate-800" {...props} />
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
        const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "")
        const resolved = path.join(currentDir, src).replace(/\\/g, "/")
        src = `/api/assets?path=${encodeURIComponent(resolved)}`
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={(alt as string) || ""}
          loading="lazy"
          className="
            my-8 h-auto max-w-full border border-tech-main/30 bg-tech-main/5 p-1
            shadow-sm
          "
        />
      )
    },
    pre: preComponent,
    code: codeComponent,
  } as Record<string, MarkdownComponent>
}

export function getPluginsForContent(
  content: string,
  rehypeShikiPlugin?: Awaited<ReturnType<typeof createRehypeShiki>>
) {
  const remarkPlugins: Array<
    typeof remarkGfm | typeof remarkMath | typeof remarkBreaks
  > = [remarkGfm, remarkBreaks]
  const rehypePlugins: Array<
    | typeof rehypeRaw
    | typeof rehypeKatex
    | typeof rehypeSlug
    | typeof rehypeCJKSpacing
    | typeof rehypeLinkedCode
    | Awaited<ReturnType<typeof createRehypeShiki>>
  > = [rehypeRaw, rehypeLinkedCode, rehypeSlug]

  if (
    content.includes("$") ||
    content.includes("\\(") ||
    content.includes("\\[")
  ) {
    remarkPlugins.push(remarkMath)
    rehypePlugins.splice(2, 0, rehypeKatex)
  }

  if (rehypeShikiPlugin) {
    rehypePlugins.push(rehypeShikiPlugin)
  }

  rehypePlugins.push(rehypeCJKSpacing)

  return { remarkPlugins, rehypePlugins }
}
