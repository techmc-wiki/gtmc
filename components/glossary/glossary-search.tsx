"use client"

import { useCallback, useEffect, useRef, type ChangeEvent } from "react"
import { useTranslations } from "next-intl"
import { SearchIcon } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/shadcn/input-group"

export interface GlossarySearchProps {
  /** URL-backed query state owned by the parent (nuqs). */
  query: string
  /** URL-backed scope state owned by the parent (nuqs). */
  scope: "active" | "all"
  onQueryChange: (q: string) => void
  onScopeChange: (scope: "active" | "all") => void
  resultCount: number
  totalCount: number
  className?: string
}

export function GlossarySearch({
  query,
  scope,
  onQueryChange,
  onScopeChange,
  resultCount,
  totalCount,
  className = "",
}: GlossarySearchProps) {
  const t = useTranslations("Glossary")
  const inputRef = useRef<HTMLInputElement>(null)

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
        onQueryChange("")
      }
    }
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [query, onQueryChange])

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onQueryChange(e.target.value)
    },
    [onQueryChange]
  )

  const toggleScope = useCallback(() => {
    onScopeChange(scope === "active" ? "all" : "active")
  }, [scope, onScopeChange])

  const isActiveScope = scope === "active"
  const scopeLabel = isActiveScope
    ? t("searchScopeActive")
    : t("searchScopeAll")

  return (
    <search
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center ${className}`}>
      <InputGroup className="col-span-2 h-9 min-h-0 sm:col-span-1 sm:flex-1">
        <InputGroupAddon align="inline-start">
          <SearchIcon className="text-tech-main/60 size-3.5" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          placeholder={t("searchPlaceholder")}
          aria-label="Search glossary terms"
          autoComplete="off"
          spellCheck={false}
        />
        <InputGroupAddon align="inline-end" className="hidden sm:flex">
          <InputGroupText className="tabular-nums">
            {resultCount} / {totalCount}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>

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
