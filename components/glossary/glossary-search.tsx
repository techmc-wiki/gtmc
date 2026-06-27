"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

const DEBOUNCE_MS = 100

export interface GlossarySearchProps {
  onQueryChange: (q: string) => void
  onScopeChange: (scope: "active" | "all") => void
  resultCount: number
  totalCount: number
  className?: string
}

export function GlossarySearch({
  onQueryChange,
  onScopeChange,
  resultCount,
  totalCount,
  className = "",
}: GlossarySearchProps) {
  const t = useTranslations("Glossary")
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<"active" | "all">("active")
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleQueryChange = useCallback(
    (nextQuery: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        onQueryChange(nextQuery)
      }, DEBOUNCE_MS)
    },
    [onQueryChange]
  )

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    },
    []
  )

  // Capture phase so descendant handlers can't swallow Cmd+/ before it lands.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }
      if (
        e.key === "Escape" &&
        document.activeElement === inputRef.current &&
        query.length > 0
      ) {
        setQuery("")
      }
    }
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [query])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      setQuery(next)
      scheduleQueryChange(next)
    },
    [scheduleQueryChange]
  )

  const toggleScope = useCallback(() => {
    setScope((prev) => {
      const next = prev === "active" ? "all" : "active"
      onScopeChange(next)
      return next
    })
  }, [onScopeChange])

  const isActiveScope = scope === "active"
  const scopeLabel = isActiveScope
    ? t("searchScopeActive")
    : t("searchScopeAll")

  return (
    <search
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center ${className}`}>
      <div className="border-tech-main/40 focus-within:border-tech-main/70 bg-surface-input/50 col-span-2 flex h-9 min-w-0 flex-1 items-stretch border transition-colors sm:col-span-1">
        <span
          aria-hidden="true"
          className="text-tech-main/60 flex items-center px-3 font-mono text-sm select-none">
          &gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={t("searchPlaceholder")}
          aria-label="Search glossary terms"
          autoComplete="off"
          spellCheck={false}
          className="text-tech-main-dark placeholder:text-tech-main/50 w-full bg-transparent pr-3 font-mono text-sm outline-none"
        />
        <span className="text-tech-main/50 hidden items-center pr-3 font-mono text-xs whitespace-nowrap select-none sm:flex">
          {resultCount} of {totalCount}
        </span>
      </div>

      <button
        type="button"
        onClick={toggleScope}
        aria-pressed={!isActiveScope}
        aria-label={scopeLabel}
        className={`tracking-tech-wide flex h-9 cursor-pointer items-center justify-center border px-3 font-mono text-xs uppercase transition-colors sm:px-4 ${
          isActiveScope
            ? "border-tech-main/60 bg-tech-main/10 text-tech-main-dark"
            : "border-tech-main/20 text-tech-main/70 hover:border-tech-main/40"
        }`}>
        [{scopeLabel}]
      </button>

      <span className="border-tech-main/20 text-tech-main/50 bg-surface-overlay/35 flex h-9 items-center border px-3 font-mono text-xs whitespace-nowrap select-none sm:hidden">
        {resultCount} of {totalCount}
      </span>
    </search>
  )
}
