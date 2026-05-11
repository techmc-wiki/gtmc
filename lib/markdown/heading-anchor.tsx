"use client"

import React, { useState } from "react"
import { useTranslations } from "next-intl"

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
  const [copied, setCopied] = useState(false)

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()

    const url = window.location.origin + window.location.pathname + "#" + id

    navigator.clipboard.writeText(url).catch(() => {})

    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      aria-label={t("copyHeadingLink")}
      onClick={handleClick}
      className={`
        ${positionClass[level]}
        opacity-0 transition-opacity
        group-hover:opacity-100
        ${copied ? "text-tech-main" : "text-tech-main"}
        cursor-pointer border-none bg-transparent p-0 no-underline
      `}>
      {copied ? "✓" : "#"}
    </button>
  )
}
