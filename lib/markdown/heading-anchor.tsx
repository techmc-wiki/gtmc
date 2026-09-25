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
 * Keep the anchor discoverable in the same order as headings for pointer and keyboard
 * readers; H1 remains the page title and owns its action cluster.
 *
 * The responsive gutter offsets align the control with each card's padding edge while
 * `top-[0.5lh]` centers it on the first line box, independent of wrapped-line height.
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
