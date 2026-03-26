"use client"

import { useState } from "react"

export function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="font-mono text-[10px] tracking-widest text-tech-main uppercase hover:text-tech-main/80 transition-colors">
      {copied ? "COPIED" : "COPY"}
    </button>
  )
}
