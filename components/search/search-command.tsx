"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { articleUrl } from "@/lib/articles/url"
import {
  OPEN_GLOSSARY_TERM_EVENT,
  type OpenGlossaryTermDetail,
} from "@/lib/glossary/browser-events"
import { useMounted } from "@/hooks/use-mounted"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/shadcn/command"

interface SearchResult {
  title: string
  slug: string
  snippet: string | null
  matchType: "title" | "content"
}

interface GlossarySearchResult {
  slug: string
  fullFormEn: string
  shortForm: string
  category: string
}

function SearchIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className={className}>
      <circle
        cx="7"
        cy="7"
        r="4.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m10.25 10.25 3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function SearchCommand() {
  const t = useTranslations("Search")
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const isMounted = useMounted()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [glossaryResults, setGlossaryResults] = useState<
    GlossarySearchResult[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setQuery("")
    setResults([])
    setGlossaryResults([])
    setIsLoading(false)
  }, [])

  const openModal = useCallback(() => {
    setIsOpen(true)
  }, [])

  // Global Cmd+K / Ctrl+K handler. Register in the capture phase so dormant
  // article dialogs do not intercept the shortcut before search can open.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen((prev) => {
          if (prev) {
            // Closing — reset state synchronously
            setQuery("")
            setResults([])
            setGlossaryResults([])
            setIsLoading(false)
          }
          return !prev
        })
      }
    }
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      return
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)

      fetch(
        `/api/articles/search?q=${encodeURIComponent(query)}&locale=${locale}`,
        {
          signal: controller.signal,
        }
      )
        .then((res) => res.json())
        .then((data) => {
          if (!controller.signal.aborted) {
            setResults(data.results || [])
            setGlossaryResults(data.glossary || [])
            setIsLoading(false)
          }
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setIsLoading(false)
          }
        })
    }, 300)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [query, locale])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (!value || value.length < 2) {
      setResults([])
      setGlossaryResults([])
      setIsLoading(false)
    }
  }, [])

  const navigateToResult = useCallback(
    (result: SearchResult) => {
      const currentSlug = pathname.replace(/^\/articles\//, "")
      const decodedCurrentSlug = currentSlug
        .split("/")
        .map(decodeURIComponent)
        .join("/")

      if (decodedCurrentSlug === result.slug) {
        closeModal()
        if (result.snippet && query.trim().length >= 2) {
          const event = new CustomEvent("highlight-search", {
            detail: { query: query.trim() },
          })
          window.dispatchEvent(event)
        }
        return
      }

      closeModal()
      const highlightParam =
        result.snippet && query.trim().length >= 2
          ? `?highlight=${encodeURIComponent(query.trim())}`
          : ""
      router.push(`${articleUrl(result.slug)}${highlightParam}`)
    },
    [router, closeModal, query, pathname]
  )

  const navigateToGlossaryResult = useCallback(
    (entry: GlossarySearchResult) => {
      closeModal()
      router.push(`/glossary#term=${encodeURIComponent(entry.slug)}`)
      window.dispatchEvent(
        new CustomEvent<OpenGlossaryTermDetail>(OPEN_GLOSSARY_TERM_EVENT, {
          detail: { slug: entry.slug },
        })
      )
    },
    [router, closeModal]
  )

  // Highlight matched text in title/snippet
  const highlightMatch = useCallback(
    (text: string) => {
      if (!query || query.length < 2) return text
      const escapedQuery = query.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`(${escapedQuery})`, "gi")
      const parts = text.split(regex)
      let position = 0

      return parts.map((part, i) => {
        const start = position
        position += part.length

        return i % 2 === 1 ? (
          <mark
            key={`${part}-${start}`}
            className="bg-tech-main/20 text-tech-main-dark px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      })
    },
    [query]
  )

  // Platform-aware shortcut label
  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl+K"
    return navigator.platform.toLowerCase().includes("mac") ? (
      <span className="flex flex-row items-center gap-0.5 leading-none">
        <span className="text-xs">{"\u2318"}</span>K
      </span>
    ) : (
      "Ctrl+K"
    )
  }, [])

  // Don't render portal until mounted (SSR safety)
  if (!isMounted) {
    return (
      <button
        type="button"
        className="border-tech-main/40 text-tech-main/60 hover:bg-tech-main-dark hover:text-tech-bg hidden cursor-pointer items-center gap-2 border px-3 py-1.5 font-mono text-[0.6875rem] transition-colors md:flex">
        <SearchIcon className="size-3.5" />
        {t("heading")}
        <span className="border-tech-main/30 text-tech-main/40 ml-1 border px-1 py-0.5 text-[0.5625rem]">
          <span className="flex flex-row items-center gap-0.5 leading-none">
            <span className="text-xs">{"\u2318"}</span>K
          </span>
        </span>
      </button>
    )
  }

  return (
    <>
      {/* Trigger button — desktop only */}
      <button
        type="button"
        onClick={openModal}
        aria-label={t("searchAriaLabel")}
        className="border-tech-main/40 text-tech-main/60 hover:bg-tech-main-dark hover:text-tech-bg hidden h-8 w-40 cursor-pointer items-center gap-2 border px-3 font-mono text-[0.6875rem] transition-colors md:flex md:h-10">
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-1.5 leading-none">
            <SearchIcon className="size-3.5" />
            <span className="mt-0.5 text-[0.625rem]">{t("heading")}</span>
          </span>
          <span className="border-tech-main/30 text-tech-main/40 border px-1 text-[0.625rem]">
            {shortcutLabel}
          </span>
        </div>
      </button>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={openModal}
        className="text-tech-main hover:bg-tech-main/10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center p-2 transition-colors md:hidden"
        aria-label={t("searchAriaLabel")}>
        <SearchIcon className="size-5" />
      </button>

      {/* Search modal */}
      <CommandDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
        title={t("searchAriaLabel")}
        description={t("placeholder")}
        shouldFilter={false}
        showCloseButton={false}
        className="border-tech-main bg-surface-modal/95 top-[10vh] left-1/2 w-full max-w-xl -translate-x-1/2 border shadow-xl backdrop-blur-md sm:top-[15vh]">
        {/* Header */}
        <header className="guide-line flex items-center justify-between border-b px-4 py-3">
          <div className="text-tech-main-dark flex items-center gap-2 text-sm font-semibold">
            <span className="bg-tech-main/80 inline-block size-1.5 animate-pulse" />
            {t("modalTitle")}
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="border-tech-main/40 text-tech-main/70 hover:bg-tech-main-dark hover:text-tech-bg cursor-pointer border px-2 py-0.5 font-mono text-[0.625rem] transition-colors">
            ESC
          </button>
        </header>

        {/* Search input */}
        <div className="guide-line border-b px-4 py-3">
          <CommandInput
            ref={inputRef}
            value={query}
            onValueChange={handleQueryChange}
            placeholder={t("placeholder")}
            aria-label={t("searchAriaLabel")}
            className="border-tech-main/40 text-tech-main-dark placeholder:text-tech-main/50 focus:border-tech-main/70 bg-surface-input/60 focus:bg-surface-input/80 w-full border px-3 py-2.5 text-sm transition-colors outline-none"
          />
        </div>

        <CommandList className="custom-left-scrollbar max-h-[50vh]">
          {/* Status line */}
          {query.length >= 2 && (
            <div className="guide-line text-tech-main/50 border-b px-4 py-2 text-xs">
              {isLoading
                ? t("scanning")
                : results.length === 20
                  ? t("resultsCountCapped", { count: results.length })
                  : t("resultsCount", { count: results.length })}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="px-4 py-6">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="bg-tech-main/10 h-4 w-3/5 animate-pulse" />
                    <div className="bg-tech-main/5 h-3 w-2/5 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results list */}
          {!isLoading && results.length > 0 && (
            <CommandGroup>
              {results.map((result) => (
                <CommandItem
                  key={result.slug}
                  value={result.slug}
                  onSelect={() => navigateToResult(result)}
                  className="cursor-pointer px-4 py-3"
                  aria-label={t("selectResult", { title: result.title })}>
                  {/* Title */}
                  <div className="text-tech-main-dark text-sm font-medium">
                    {highlightMatch(result.title)}
                  </div>

                  {/* Path */}
                  <div className="text-tech-main/60 mt-0.5 font-mono text-[0.625rem] tracking-wider">
                    {t("pathLabel")} /{result.slug}
                  </div>

                  {/* Content snippet */}
                  {result.snippet && (
                    <div className="text-tech-main/70 mt-1 text-xs/relaxed">
                      {highlightMatch(result.snippet)}
                    </div>
                  )}

                  {/* Match type badge */}
                  <div className="text-tech-main/50 absolute top-3 right-4 font-mono text-[0.5625rem] tracking-wider">
                    {result.matchType === "content"
                      ? t("matchBody")
                      : t("matchTitle")}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Glossary section */}
          {!isLoading && glossaryResults.length > 0 && (
            <CommandGroup className="guide-line border-t">
              <div className="text-tech-main/50 flex items-center gap-2 px-4 pt-3 pb-1 text-xs font-medium">
                <span className="bg-tech-signal inline-block size-1.5" />
                {t("glossarySection")}
              </div>
              {glossaryResults.map((entry) => (
                <CommandItem
                  key={entry.slug}
                  value={`glossary-${entry.slug}`}
                  onSelect={() => navigateToGlossaryResult(entry)}
                  className="flex cursor-pointer items-baseline gap-3 px-4 py-2.5"
                  aria-label={t("selectResult", {
                    title: entry.fullFormEn,
                  })}>
                  <span className="text-tech-main-dark text-sm font-medium">
                    {highlightMatch(entry.fullFormEn)}
                  </span>
                  {entry.shortForm && (
                    <span className="text-tech-main/60 font-mono text-xs">
                      {highlightMatch(entry.shortForm)}
                    </span>
                  )}
                  <span className="text-tech-main/40 ml-auto font-mono text-[0.5625rem] tracking-wider">
                    {entry.category}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Empty state */}
          {!isLoading &&
            query.length >= 2 &&
            results.length === 0 &&
            glossaryResults.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="text-tech-main/60 text-sm">{t("noMatch")}</div>
                <div className="text-tech-main/40 mt-1 text-xs">
                  {t("tryDifferentKeywords")}
                </div>
              </div>
            )}

          {/* Initial state */}
          {query.length < 2 && (
            <div className="px-4 py-8 text-center">
              <div className="text-tech-main/60 text-sm">
                {t("awaitingInput")}
              </div>
              <div className="text-tech-main/40 mt-1 text-xs">
                {t("minCharsHint")}
              </div>
            </div>
          )}
        </CommandList>

        {/* Footer hints */}
        <footer className="guide-line text-tech-main/60 flex items-center gap-4 border-t px-4 py-2 font-mono text-[0.625rem]">
          <span>
            <kbd className="kbd-badge">&#x2191;&#x2193;</kbd>{" "}
            {t("navigateHint")}
          </span>
          <span>
            <kbd className="kbd-badge">&#x23CE;</kbd> {t("openHint")}
          </span>
          <span>
            <kbd className="kbd-badge">ESC</kbd> {t("dismissHint")}
          </span>
        </footer>
      </CommandDialog>
    </>
  )
}
