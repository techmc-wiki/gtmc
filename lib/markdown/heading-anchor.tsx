"use client"

import React, { useCallback } from "react"
import { Check, CircleAlert, Link2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/cn"

interface HeadingAnchorProps {
  id: string
}

/**
 * Copy-link control in the gutter of an H2/H3 markdown heading. Hidden until
 * the heading is hovered or the control itself takes keyboard focus, so a
 * keyboard reader reaches it in the same place a pointer reader sees it. The
 * mark swaps with the copy result and the result is announced through the
 * same live region `CopyButton` uses; a tooltip is deliberately omitted
 * because the control appears under a cursor that is already moving through
 * the prose. The H1 carries no anchor: it is the page title (its id stays for
 * outline/TOC links) and already owns the labelled action cluster.
 *
 * One gutter geometry for every level. The reader card gutter is `p-6` (24px)
 * below `sm` and `sm:p-8` (32px) at `sm+`, so a `size-5` box at `-left-6`
 * spans [-24, -4] and a `sm:size-6` box at `sm:-left-8` spans [-32, -8]:
 * flush with the padding edge, a small gap to the text, and never outside
 * the gutter. `top-[0.5lh]` centers on the first line box (the button
 * inherits the heading's font and line-height through preflight) instead of
 * the whole padding box, so bottom padding and wrapping never bias it.
 */
export function HeadingAnchor({ id }: HeadingAnchorProps) {
  const t = useTranslations("ArticleMeta")
  const { state, copy } = useCopyToClipboard()
  const isCopied = state === "copied"
  const isFailed = state === "failed"
  const label = isFailed
    ? t("copyFailed")
    : isCopied
      ? t("copiedButton")
      : t("copyHeadingLink")

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()

      void copy(
        () => window.location.origin + window.location.pathname + "#" + id
      )
    },
    [copy, id]
  )

  return (
    <button
      type="button"
      data-heading-anchor=""
      aria-label={label}
      aria-busy={state === "pending"}
      onClick={handleClick}
      className={cn(
        "absolute -left-6 top-[0.5lh] size-5 -translate-y-1/2 sm:-left-8 sm:size-6",
        "text-tech-main/50 hover:text-tech-main-dark group-hover:opacity-100 focus-visible:opacity-100 flex cursor-pointer items-center justify-center border-none bg-transparent p-0 opacity-0 no-underline transition-opacity focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-none",
        isFailed && "text-destructive"
      )}>
      <span
        className="t-icon-swap"
        data-state={isCopied ? "b" : "a"}
        aria-hidden="true">
        <span className="t-icon" data-icon="a">
          {isFailed ? (
            <CircleAlert className="size-3.5 sm:size-4" />
          ) : (
            <Link2 className="size-3.5 sm:size-4" />
          )}
        </span>
        <span className="t-icon" data-icon="b">
          <Check className="size-3.5 sm:size-4" />
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {state === "idle" ? "" : label}
      </span>
    </button>
  )
}
