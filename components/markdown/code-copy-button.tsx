"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

export function CodeCopyButton({ code }: { code: string }) {
  const t = useTranslations("ArticleMeta")
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
      className="text-tech-main hover:text-tech-main/80 font-mono text-[0.625rem] tracking-widest uppercase transition-colors">
      {copied ? t("copiedButton") : t("copyButton")}
    </button>
  )
}
