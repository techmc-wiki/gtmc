"use client"

import { useState } from "react"

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
  const [copied, setCopied] = useState(false)

  function handleClick() {
    const url = window.location.origin + window.location.pathname + "#" + id

    navigator.clipboard.writeText(url).catch(() => {})

    window.location.hash = id

    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      aria-label="Copy link to section"
      onClick={handleClick}
      className={`
        ${positionClass[level]}
        opacity-0 transition-opacity group-hover:opacity-100
        ${copied ? "text-tech-main" : "text-tech-main"}
        no-underline cursor-pointer bg-transparent border-none p-0
      `}>
      {copied ? "✓" : "#"}
    </button>
  )
}
