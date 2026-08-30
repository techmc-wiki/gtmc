"use client"

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useTranslations } from "next-intl"

const contentVisibilityStyle: React.CSSProperties = {
  contentVisibility: "auto",
}

const LINE_WIDTHS = [
  "w-3/4 bg-tech-accent/20",
  "w-1/2 bg-tech-accent/15",
  "w-5/6 bg-tech-accent/20",
  "w-2/5 bg-tech-accent/10",
  "w-3/5 bg-tech-accent/15",
  "w-4/5 bg-tech-accent/20",
  "w-1/3 bg-tech-accent/10",
  "w-2/3 bg-tech-accent/15",
] as const

/**
 * Intersection-observed code container: shows a skeleton until the block is
 * near the viewport, then reveals the rendered code.
 */
function LazyCodeBlock({
  id,
  lineCount,
  children,
}: {
  id?: string
  lineCount: string
  children: ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isSkeletonRemoved, setIsSkeletonRemoved] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px", threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const numLines = Math.min(parseInt(lineCount) || 8, 8)

  const handleSkeletonEnd = useCallback(() => {
    if (isVisible) setIsSkeletonRemoved(true)
  }, [isVisible])

  return (
    <div
      id={id}
      ref={containerRef}
      className="border-tech-main/30 bg-tech-bg relative my-6 w-full scroll-mt-24 border font-mono text-sm"
      style={contentVisibilityStyle}>
      <div className="border-tech-main/30 pointer-events-none absolute top-0 left-0 z-20 size-3 -translate-px border-t-2 border-l-2" />
      <div className="border-tech-main/30 pointer-events-none absolute top-0 right-0 z-20 size-3 translate-x-px -translate-y-px border-t-2 border-r-2" />
      <div className="border-tech-main/30 pointer-events-none absolute bottom-0 left-0 z-20 size-3 -translate-x-px translate-y-px border-b-2 border-l-2" />
      <div className="border-tech-main/30 pointer-events-none absolute right-0 bottom-0 z-20 size-3 translate-px border-r-2 border-b-2" />

      <div
        className={
          isVisible ? `animate-fade-in motion-reduce:animate-none` : "opacity-0"
        }>
        {children}
      </div>

      {!isSkeletonRemoved && (
        <div
          className={`bg-tech-bg absolute inset-0 z-10 flex flex-col motion-reduce:transition-opacity motion-reduce:duration-250 ${
            isVisible
              ? `animate-skeleton-exit motion-reduce:animate-none motion-reduce:opacity-0`
              : ""
          } `}
          onAnimationEnd={handleSkeletonEnd}
          onTransitionEnd={handleSkeletonEnd}>
          <div className="border-tech-main/30 bg-tech-main/10 flex items-center justify-between border-b px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-tech-main/40 size-1.5 animate-pulse" />
              <span className="bg-tech-accent/20 h-2.5 w-12" />
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-tech-accent/15 h-2.5 w-16" />
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden px-4 py-3 sm:px-6">
            <div className="animate-blueprint-sweep via-tech-accent/30 pointer-events-none absolute inset-0 bg-linear-to-r from-transparent to-transparent motion-reduce:animate-none" />
            {Array.from({ length: numLines }).map((_, i) => (
              <div
                // oxlint-disable-next-line react/no-array-index-key
                key={String(i)}
                className={`my-1.5 h-2 ${LINE_WIDTHS[i % LINE_WIDTHS.length]} `}
              />
            ))}
          </div>

          {/* eslint-disable react/jsx-no-comment-textnodes, react/jsx-curly-brace-presence */}
          <div className="border-tech-main/10 flex items-center justify-end border-t px-4 py-1">
            <span className="text-tech-main/50 font-mono text-[0.5625rem] tracking-widest uppercase select-none">
              {"// SYNTAX_HIGHLIGHT"}
            </span>
          </div>
          {/* eslint-enable react/jsx-no-comment-textnodes, react/jsx-curly-brace-presence */}
        </div>
      )}
    </div>
  )
}

function ClipboardButton({
  ariaLabel,
  doneLabel,
  getValue,
  idleLabel,
}: {
  ariaLabel: string
  doneLabel: string
  getValue: () => string
  idleLabel: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getValue())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="text-tech-main hover:text-tech-main/80 font-mono text-[0.625rem] tracking-widest uppercase transition-colors">
      {copied ? doneLabel : idleLabel}
    </button>
  )
}

type CodeBlockPreProps = {
  children?: ReactNode
  "data-raw-code"?: string
  "data-lang"?: string
  "data-line-count"?: string
  "data-mc"?: string
  "data-mapping"?: string
  "data-decompiler"?: string
  "data-source-file"?: string
  "data-source-lines"?: string
  id?: string
  [key: string]: unknown
}

/**
 * Markdown `<pre>` replacement: language strip with copy/wrap controls over a
 * lazily revealed code frame.
 */
export function CodeBlockPre({ children, ...props }: CodeBlockPreProps) {
  const t = useTranslations("CommonA11y")
  const tArticleMeta = useTranslations("ArticleMeta")
  const rawCode = props["data-raw-code"] as string | undefined
  const lang = (props["data-lang"] as string) || ""
  const lineCount = (props["data-line-count"] as string) || "0"
  const id = props.id
  const minecraftVersion = props["data-mc"]
  const mapping = props["data-mapping"]
  const decompiler = props["data-decompiler"]
  const sourceFile = props["data-source-file"]
  const sourceLines = props["data-source-lines"]
  const [isWrapped, setIsWrapped] = useState(false)

  const toggleWrap = useCallback(() => {
    setIsWrapped((v) => !v)
  }, [])

  // Calculate line number width based on digit count
  const lineCountNum = parseInt(lineCount, 10)
  const digitCount = String(lineCountNum).length
  const lineNumWidth =
    digitCount === 1 ? "2.5rem" : digitCount === 2 ? "3rem" : "3.5rem"

  const codeBlockStyle = useMemo(
    (): React.CSSProperties =>
      ({
        "--line-num-width": lineNumWidth,
      }) as React.CSSProperties,
    [lineNumWidth]
  )

  if (!rawCode) return <>{children}</>

  return (
    <LazyCodeBlock id={id} lineCount={lineCount}>
      <div className="guide-line bg-tech-main/10 border-b">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-tech-main/40 size-1.5 animate-pulse" />
            <span className="text-tech-main text-xs tracking-widest uppercase">
              {lang}
            </span>
            {minecraftVersion && (
              <span className="border-tech-main/20 text-tech-main/75 border-l pl-2 text-[0.625rem] tracking-wider uppercase">
                MC {minecraftVersion}
              </span>
            )}
            {mapping && (
              <span className="text-tech-main/65 text-[0.625rem] tracking-wider uppercase">
                {mapping}
              </span>
            )}
            {decompiler && (
              <span className="text-tech-main/50 text-[0.625rem] tracking-wider uppercase">
                {decompiler}
              </span>
            )}
          </div>
          <div className="text-tech-main flex flex-wrap items-center gap-3 font-mono text-[0.625rem] tracking-widest">
            <span>{lineCount} LINES</span>
            {id && (
              <>
                <span className="text-tech-main/50">|</span>
                <ClipboardButton
                  ariaLabel={tArticleMeta("copyCodeLink")}
                  doneLabel={tArticleMeta("copiedButton")}
                  getValue={() =>
                    `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`
                  }
                  idleLabel={tArticleMeta("linkButton")}
                />
              </>
            )}
            <span className="text-tech-main/50">|</span>
            <button
              type="button"
              aria-label={t("toggleLineWrap")}
              title={t("toggleLineWrap")}
              onClick={toggleWrap}
              className={`font-mono text-[0.625rem] tracking-widest transition-colors ${
                isWrapped
                  ? "text-tech-main"
                  : `text-tech-main/40 hover:text-tech-main/70`
              } `}>
              ↩
            </button>
            <span className="text-tech-main/50">|</span>
            <ClipboardButton
              ariaLabel={tArticleMeta("copyCode")}
              doneLabel={tArticleMeta("copiedButton")}
              getValue={() => rawCode}
              idleLabel={tArticleMeta("copyButton")}
            />
          </div>
        </div>
        {(sourceFile || sourceLines) && (
          <div className="border-tech-main/15 text-tech-main/55 flex flex-wrap items-center gap-x-2 border-t px-4 py-1 font-mono text-[0.5625rem] tracking-wider">
            <span className="uppercase">{tArticleMeta("sourceLabel")}</span>
            {sourceFile && (
              <span className="text-tech-main/75">{sourceFile}</span>
            )}
            {sourceLines && (
              <span className="text-tech-main/60">L{sourceLines}</span>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <div className="border-tech-main/10 pointer-events-none absolute inset-0 border" />
        <div className="bg-tech-main/3 pointer-events-none absolute inset-x-0 top-1/4 h-px" />
        <div className="bg-tech-main/3 pointer-events-none absolute inset-x-0 top-3/4 h-px" />
        <div
          className="code-block-pre relative"
          data-wrapped={isWrapped}
          style={codeBlockStyle}>
          <div className="custom-bottom-scrollbar overflow-x-auto">
            <div
              dir="ltr"
              className={
                isWrapped
                  ? `p-4 whitespace-pre-wrap [&_.line]:whitespace-pre-wrap! [&_code]:whitespace-pre-wrap!`
                  : `p-4 whitespace-pre [&_code]:whitespace-pre!`
              }>
              {children}
            </div>
          </div>
        </div>
      </div>
    </LazyCodeBlock>
  )
}
