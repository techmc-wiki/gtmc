"use client"

import { CopyButton } from "@/components/ui/copy-button"
import { IconButton } from "@/components/ui/icon-button"
import { Badge } from "@/components/ui/shadcn/badge"
import { Separator } from "@/components/ui/shadcn/separator"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { Link as LinkIcon, WrapText } from "lucide-react"

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

  return (
    <div
      id={id}
      ref={containerRef}
      data-state={isVisible ? "loaded" : "loading"}
      className={`t-skel border-tech-main/30 bg-tech-bg relative my-6 w-full scroll-mt-24 border font-mono text-sm ${isVisible ? "is-revealed" : ""}`}
      style={contentVisibilityStyle}>
      <CornerBrackets
        size="size-3"
        color="border-tech-main/30"
        className="z-20"
      />

      <div className="t-skel-content">{children}</div>

      <div
        aria-hidden="true"
        className={`t-skel-skeleton bg-tech-bg pointer-events-none absolute inset-0 z-10 flex flex-col ${isVisible ? "" : "is-pulsing"}`}>
        <div className="border-tech-main/30 bg-tech-main/5 flex items-center justify-between border-b px-3 py-1">
          <div className="flex items-center gap-2.5">
            <span className="bg-tech-accent/25 h-4 w-10" />
            <span className="bg-tech-accent/15 h-2.5 w-16" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-tech-accent/15 size-3" />
            <span className="bg-tech-accent/15 size-3" />
            <span className="bg-tech-accent/15 size-3" />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden px-4 py-3 sm:px-6">
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
    </div>
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

interface CodeBlockHeaderProps {
  copyCodeLabel: string
  copyFailedLabel: string
  copyLinkLabel: string
  copiedLabel: string
  decompiler?: string
  id?: string
  isWrapped: boolean
  lang: string
  mapping?: string
  minecraftVersion?: string
  onToggleWrap: () => void
  rawCode: string
  sourceFile?: string
  sourceLabel: string
  sourceLines?: string
  toggleLineWrapLabel: string
}

/**
 * The listing's caption. The language identifies the block, so it gets a chip;
 * version, mapping, and decompiler are provenance for that language and stay
 * quiet behind the chip. The line count is deliberately absent: the gutter
 * already numbers every line, so repeating the total is chrome, not content.
 */
function CodeBlockHeader({
  copyCodeLabel,
  copyFailedLabel,
  copyLinkLabel,
  copiedLabel,
  decompiler,
  id,
  isWrapped,
  lang,
  mapping,
  minecraftVersion,
  onToggleWrap,
  rawCode,
  sourceFile,
  sourceLabel,
  sourceLines,
  toggleLineWrapLabel,
}: CodeBlockHeaderProps) {
  const provenance = [
    minecraftVersion ? `MC ${minecraftVersion}` : null,
    mapping,
    decompiler,
  ].filter((item): item is string => Boolean(item))

  return (
    <div className="guide-line bg-tech-main/5 border-b">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          {lang ? (
            <Badge
              variant="outline"
              className="text-tech-main border-tech-main/25 bg-tech-main/5 rounded-none px-1.5 font-mono text-[0.625rem] font-medium tracking-wide uppercase">
              {lang}
            </Badge>
          ) : null}
          {provenance.length > 0 ? (
            <div className="text-tech-main/65 flex items-center gap-x-2 font-mono text-[0.625rem] tracking-wide uppercase">
              {provenance.map((item, index) => (
                <React.Fragment key={item}>
                  {index > 0 ? (
                    <Separator orientation="vertical" className="h-3" />
                  ) : null}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
        <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
          {id && (
            <CopyButton
              className="md:size-7"
              getValue={() =>
                `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`
              }
              label={copyLinkLabel}
              copiedLabel={copiedLabel}
              failedLabel={copyFailedLabel}
              icon={<LinkIcon className="size-3.5" />}
            />
          )}
          <IconButton
            className="md:size-7"
            label={toggleLineWrapLabel}
            onClick={onToggleWrap}
            aria-pressed={isWrapped}>
            <WrapText aria-hidden />
          </IconButton>
          <CopyButton
            className="md:size-7"
            getValue={() => rawCode}
            label={copyCodeLabel}
            copiedLabel={copiedLabel}
            failedLabel={copyFailedLabel}
          />
        </div>
      </div>
      {sourceFile || sourceLines ? (
        <div className="border-tech-main/15 text-tech-main/55 flex flex-wrap items-center gap-x-2 border-t px-4 py-1 font-mono text-[0.5625rem] tracking-wider">
          <span className="uppercase">{sourceLabel}</span>
          {sourceFile && (
            <span className="text-tech-main/75">{sourceFile}</span>
          )}
          {sourceLines && (
            <span className="text-tech-main/60">L{sourceLines}</span>
          )}
        </div>
      ) : null}
    </div>
  )
}

function CodeBlockBody({
  children,
  codeBlockStyle,
  isWrapped,
}: {
  children?: ReactNode
  codeBlockStyle: React.CSSProperties
  isWrapped: boolean
}) {
  return (
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
                ? "p-4 whitespace-pre-wrap [&_.line]:whitespace-pre-wrap! [&_code]:whitespace-pre-wrap!"
                : "p-4 whitespace-pre [&_code]:whitespace-pre!"
            }>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

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
      <CodeBlockHeader
        copyCodeLabel={tArticleMeta("copyCode")}
        copyFailedLabel={tArticleMeta("copyFailed")}
        copyLinkLabel={tArticleMeta("copyCodeLink")}
        copiedLabel={tArticleMeta("copiedButton")}
        decompiler={decompiler}
        id={id}
        isWrapped={isWrapped}
        lang={lang}
        mapping={mapping}
        minecraftVersion={minecraftVersion}
        onToggleWrap={toggleWrap}
        rawCode={rawCode}
        sourceFile={sourceFile}
        sourceLabel={tArticleMeta("sourceLabel")}
        sourceLines={sourceLines}
        toggleLineWrapLabel={t("toggleLineWrap")}
      />
      <CodeBlockBody codeBlockStyle={codeBlockStyle} isWrapped={isWrapped}>
        {children}
      </CodeBlockBody>
    </LazyCodeBlock>
  )
}
