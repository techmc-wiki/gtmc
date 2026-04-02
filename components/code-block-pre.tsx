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
  const lineCountNum = parseInt(lineCount, 10) || 0
  const [isWrapped, setIsWrapped] = useState(false)

  if (!rawCode) return <>{children}</>

  return (
    <LazyCodeBlock lang={lang} lineCount={lineCount}>
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
          <button
            type="button"
            aria-label="Toggle line wrap"
            title="Toggle line wrap"
            onClick={() => setIsWrapped((v) => !v)}
            className={`font-mono text-[10px] tracking-widest transition-colors ${
              isWrapped
                ? "text-tech-main"
                : "text-tech-main/40 hover:text-tech-main/70"
            }`}>
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
        <div className="code-block-pre relative flex">
          {lineCountNum > 0 && (
            <div
              aria-hidden="true"
              className="
                line-numbers-col shrink-0 select-none border-r border-tech-main/20
                bg-tech-bg py-3 pr-3 pl-4 text-right font-mono text-sm
                text-tech-main/40
              "
              style={{
                minWidth: `calc(${Math.max(2, String(lineCountNum).length)}ch + 2rem)`,
              }}>
              {Array.from({ length: lineCountNum }, (_, i) => {
                const lineNum = i + 1
                return <div key={`line-${lineNum}`}>{lineNum}</div>
              })}
            </div>
          )}
          <div className="custom-bottom-scrollbar overflow-x-auto flex-1 px-4 sm:px-6">
            <div
              dir="ltr"
              className={
                isWrapped
                  ? "whitespace-pre-wrap [&_code]:!whitespace-pre-wrap"
                  : "whitespace-pre [&_code]:!whitespace-pre"
              }>
              {children}
            </div>
          </div>
        </div>
      </div>
    </LazyCodeBlock>
  )
}
