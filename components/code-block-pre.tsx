"use client"

import { useState, type ReactNode } from "react"
import { CodeCopyButton } from "@/components/code-copy-button"
import { LazyCodeBlock } from "@/components/lazy-code-block"

type CodeBlockPreProps = {
  children?: ReactNode
  "data-raw-code"?: string
  "data-lang"?: string
  "data-line-count"?: string
  [key: string]: unknown
}

export function CodeBlockPre({ children, ...props }: CodeBlockPreProps) {
  const rawCode = props["data-raw-code"] as string | undefined
  const lang = (props["data-lang"] as string) || ""
  const lineCount = (props["data-line-count"] as string) || "0"
  const [isWrapped, setIsWrapped] = useState(false)

  // Calculate line number width based on digit count
  const lineCountNum = parseInt(lineCount, 10)
  const digitCount = String(lineCountNum).length
  const lineNumWidth =
    digitCount === 1 ? "2.5rem" : digitCount === 2 ? "3rem" : "3.5rem"

  if (!rawCode) return <>{children}</>

  return (
    <LazyCodeBlock lang={lang} lineCount={lineCount}>
      <div
        className="
          flex items-center justify-between border-b guide-line bg-tech-main/10
          px-4 py-1.5
        ">
        <div className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse bg-tech-main/40" />
          <span className="text-xs tracking-widest text-tech-main uppercase">
            {lang}
          </span>
        </div>
        <div
          className="
            flex items-center gap-3 font-mono text-[0.625rem] tracking-widest
            text-tech-main
          ">
          <span>{lineCount} LINES</span>
          <span className="text-tech-main/50">|</span>
          <button
            type="button"
            aria-label="Toggle line wrap"
            title="Toggle line wrap"
            onClick={() => setIsWrapped((v) => !v)}
            className={`
              font-mono text-[0.625rem] tracking-widest transition-colors
              ${
                isWrapped
                  ? "text-tech-main"
                  : `
                    text-tech-main/40
                    hover:text-tech-main/70
                  `
              }
            `}>
            ↩
          </button>
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
          className="code-block-pre relative"
          data-wrapped={isWrapped}
          style={
            {
              "--line-num-width": lineNumWidth,
            } as React.CSSProperties
          }>
          <div className="custom-bottom-scrollbar overflow-x-auto">
            <div
              dir="ltr"
              className={
                isWrapped
                  ? `
                    p-4 whitespace-pre-wrap
                    [&_.line]:whitespace-pre-wrap!
                    [&_code]:whitespace-pre-wrap!
                  `
                  : `
                    p-4 whitespace-pre
                    [&_code]:whitespace-pre!
                  `
              }>
              {children}
            </div>
          </div>
        </div>
      </div>
    </LazyCodeBlock>
  )
}
