"use client"

import React, { useCallback } from "react"
import { useTranslations } from "next-intl"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

interface HeadingAnchorProps {
  id: string
  level: 1 | 2 | 3
}

const positionClass: Record<1 | 2 | 3, string> = {
  1: "absolute top-1/2 -left-6 -translate-y-1/2 text-xl font-normal",
  2: "absolute top-1/2 -left-5 -translate-y-1/2 text-lg font-normal",
  3: "absolute top-1/2 -left-4 -translate-y-1/2 text-base font-normal",
}

export function HeadingAnchor({ id, level }: HeadingAnchorProps) {
  const t = useTranslations("ArticleMeta")
  const { state, copy } = useCopyToClipboard()
  const copied = state === "copied"

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
      aria-label={t("copyHeadingLink")}
      onClick={handleClick}
      className={` ${positionClass[level]} opacity-0 transition-opacity group-hover:opacity-100 ${copied ? "text-tech-main" : "text-tech-main"} cursor-pointer border-none bg-transparent p-0 no-underline`}>
      {copied ? "✓" : "#"}
    </button>
  )
}
