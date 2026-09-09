"use client"

import { ListFilter, Globe } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"

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
    <search className={`flex items-center gap-2 ${className}`}>
      <InputGroup className="min-w-0 flex-1">
        <InputGroupAddon align="inline-start">
          <SearchIcon className="text-tech-main/60 size-3.5" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          autoComplete="off"
          spellCheck={false}
        />
        <InputGroupAddon align="inline-end" className="hidden sm:flex">
          <InputGroupText className="tabular-nums">
            {resultCount} / {totalCount}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>

      <IconButton
        type="button"
        onClick={toggleScope}
        aria-pressed={!isActiveScope}
        aria-label={scopeLabel}
        variant={isActiveScope ? "secondary" : "outline"}
        className="min-h-11"
        label={scopeLabel}>
        {isActiveScope ? <ListFilter aria-hidden /> : <Globe aria-hidden />}
      </IconButton>

      <span className="sr-only sm:hidden">
        {resultCount} of {totalCount}
      </span>
    </search>
  )
}
