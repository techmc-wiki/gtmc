"use client"

import { useCallback, useEffect, useRef, type ChangeEvent } from "react"
import { useTranslations } from "next-intl"
import { SearchIcon } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/shadcn/input-group"

export interface GlossarySearchProps {
  /** URL-backed query state owned by the parent (nuqs). */
  query: string
  onQueryChange: (q: string) => void
  className?: string
}

export function GlossarySearch({
  query,
  onQueryChange,
  className = "",
}: GlossarySearchProps) {
  const t = useTranslations("Glossary")
  const inputRef = useRef<HTMLInputElement>(null)

  // Capture phase so descendant handlers can't swallow the shortcut before it lands.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target?.isContentEditable
        ) {
          return
        }
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

  return (
    <search className={className}>
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
      </InputGroup>
    </search>
  )
}
