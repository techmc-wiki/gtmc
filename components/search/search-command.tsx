"use client"

import * as React from "react"
import useSWR from "swr"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { articleUrl } from "@/lib/articles/url"
import { useMounted } from "@/hooks/use-mounted"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/shadcn/command"
import { Badge } from "@/components/ui/shadcn/badge"

interface SearchResult {
  title: string
  slug: string
  snippet: string | null
  matchType: "title" | "content"
}

interface SearchResponse {
  results?: SearchResult[]
  glossary?: GlossarySearchResult[]
}

async function fetchSearchResults(url: string): Promise<SearchResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`)
  }
  return response.json()
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

function useSearchCommand() {
  const t = useTranslations("Search")
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const isMounted = useMounted()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const prevIsOpenRef = useRef(false)
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

  // Reset search state when dialog closes (e.g. via Cmd+K toggle)
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      setQuery("")
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setQuery("")
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
        setIsOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [])

  // Debounce only the query key; SWR owns the request lifecycle.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.length >= 2 ? query : "")
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const searchKey =
    debouncedQuery.length >= 2
      ? `/api/articles/search?q=${encodeURIComponent(debouncedQuery)}&locale=${locale}`
      : null
  const { data: searchData, isValidating } = useSWR<SearchResponse>(
    searchKey,
    fetchSearchResults
  )
  const results = searchData?.results || []
  const glossaryResults = searchData?.glossary || []
  const isLoading =
    query.length >= 2 && (debouncedQuery !== query || isValidating)

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (!value || value.length < 2) setDebouncedQuery("")
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
      router.push(`/glossary/${encodeURIComponent(entry.slug)}`)
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

  return {
    closeModal,
    glossaryResults,
    handleQueryChange,
    highlightMatch,
    inputRef,
    isLoading,
    isMounted,
    isOpen,
    navigateToGlossaryResult,
    navigateToResult,
    openModal,
    query,
    results,
    shortcutLabel,
    t,
  }
}

type SearchCommandState = ReturnType<typeof useSearchCommand>

export function SearchCommand() {
  const search = useSearchCommand()
  return <SearchCommandLayout search={search} />
}

function SearchCommandLayout({ search }: { search: SearchCommandState }) {
  if (!search.isMounted) {
    return <SearchCommandPlaceholder t={search.t} />
  }

  return (
    <>
      <SearchCommandTriggers
        onOpen={search.openModal}
        shortcutLabel={search.shortcutLabel}
        t={search.t}
      />
      <SearchCommandDialog search={search} />
    </>
  )
}

function SearchCommandPlaceholder({ t }: { t: SearchCommandState["t"] }) {
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

function SearchCommandTriggers({
  onOpen,
  shortcutLabel,
  t,
}: {
  onOpen: () => void
  shortcutLabel: React.ReactNode
  t: SearchCommandState["t"]
}) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
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
      <button
        type="button"
        onClick={onOpen}
        className="text-tech-main hover:bg-tech-main/10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center p-2 transition-colors md:hidden"
        aria-label={t("searchAriaLabel")}>
        <SearchIcon className="size-5" />
      </button>
    </>
  )
}

function SearchCommandDialog({ search }: { search: SearchCommandState }) {
  return (
    <CommandDialog
      open={search.isOpen}
      onOpenChange={(open) => {
        if (!open) search.closeModal()
      }}
      title={search.t("searchAriaLabel")}
      description={search.t("placeholder")}
      shouldFilter={false}
      showCloseButton={false}
      className="border-tech-main bg-surface-modal/95 top-[10vh] left-1/2 w-full max-w-xl -translate-x-1/2 border shadow-xl backdrop-blur-md sm:top-[15vh]">
      <header className="guide-line flex items-center justify-between border-b px-4 py-3">
        <div className="text-tech-main-dark flex items-center gap-2 text-sm font-semibold">
          <span className="bg-tech-main/80 inline-block size-1.5 animate-pulse" />
          {search.t("modalTitle")}
        </div>
        <button
          type="button"
          onClick={search.closeModal}
          className="border-tech-main/40 text-tech-main/70 hover:bg-tech-main-dark hover:text-tech-bg cursor-pointer border px-2 py-0.5 font-mono text-[0.625rem] transition-colors">
          ESC
        </button>
      </header>
      <div className="guide-line border-b px-4 py-3">
        <CommandInput
          ref={search.inputRef}
          value={search.query}
          onValueChange={search.handleQueryChange}
          placeholder={search.t("placeholder")}
          aria-label={search.t("searchAriaLabel")}
          className="border-tech-main/40 text-tech-main-dark placeholder:text-tech-main/50 focus:border-tech-main/70 bg-surface-input/60 focus:bg-surface-input/80 w-full border px-3 py-2.5 text-sm transition-colors outline-none"
        />
      </div>
      <SearchCommandResults search={search} />
      <footer className="guide-line text-tech-main/60 flex items-center gap-4 border-t px-4 py-2 font-mono text-[0.625rem]">
        <span>
          <kbd className="kbd-badge">&#x2191;&#x2193;</kbd>{" "}
          {search.t("navigateHint")}
        </span>
        <span>
          <kbd className="kbd-badge">&#x23CE;</kbd> {search.t("openHint")}
        </span>
        <span>
          <kbd className="kbd-badge">ESC</kbd> {search.t("dismissHint")}
        </span>
      </footer>
    </CommandDialog>
  )
}

function SearchCommandResults({ search }: { search: SearchCommandState }) {
  return (
    <CommandList className="custom-left-scrollbar max-h-[50vh]">
      {search.query.length >= 2 && (
        <div className="guide-line text-tech-main/50 border-b px-4 py-2 text-xs">
          {search.isLoading
            ? search.t("scanning")
            : search.results.length === 20
              ? search.t("resultsCountCapped", { count: search.results.length })
              : search.t("resultsCount", { count: search.results.length })}
        </div>
      )}
      {search.isLoading && (
        <div className="px-4 py-6">
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="space-y-1.5">
                <div className="bg-tech-main/10 h-4 w-3/5 animate-pulse" />
                <div className="bg-tech-main/5 h-3 w-2/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}
      {!search.isLoading && search.results.length > 0 && (
        <CommandGroup className="space-y-2 p-2">
          {search.results.map((result) => (
            <CommandItem
              key={result.slug}
              value={result.slug}
              onSelect={() => search.navigateToResult(result)}
              className="group border-tech-main/20 bg-surface-overlay/50 hover:border-tech-main/40 hover:bg-tech-main/5 data-[selected=true]:border-tech-main/40 data-[selected=true]:bg-tech-main/10 cursor-pointer items-start border px-3 py-3 transition-colors"
              aria-label={search.t("selectResult", { title: result.title })}>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-tech-main-dark text-sm font-medium">
                    {search.highlightMatch(result.title)}
                  </div>
                  <Badge
                    variant="neutral"
                    className="text-[0.5625rem] leading-none">
                    {result.matchType === "content"
                      ? search.t("matchBody")
                      : search.t("matchTitle")}
                  </Badge>
                </div>
                {result.snippet && (
                  <div className="text-tech-main/70 mt-1.5 line-clamp-2 text-xs/relaxed">
                    {search.highlightMatch(result.snippet)}
                  </div>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {!search.isLoading && search.glossaryResults.length > 0 && (
        <CommandGroup className="guide-line border-t">
          <div className="text-tech-main/50 flex items-center gap-2 px-4 pt-3 pb-1 text-xs font-medium">
            <span className="bg-tech-signal inline-block size-1.5" />
            {search.t("glossarySection")}
          </div>
          {search.glossaryResults.map((entry) => (
            <CommandItem
              key={entry.slug}
              value={`glossary-${entry.slug}`}
              onSelect={() => search.navigateToGlossaryResult(entry)}
              className="flex cursor-pointer items-baseline gap-3 px-4 py-2.5"
              aria-label={search.t("selectResult", {
                title: entry.fullFormEn,
              })}>
              <span className="text-tech-main-dark text-sm font-medium">
                {search.highlightMatch(entry.fullFormEn)}
              </span>
              {entry.shortForm && (
                <span className="text-tech-main/60 font-mono text-xs">
                  {search.highlightMatch(entry.shortForm)}
                </span>
              )}
              <span className="text-tech-main/40 ml-auto font-mono text-[0.5625rem] tracking-wider">
                {entry.category}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {!search.isLoading &&
        search.query.length >= 2 &&
        search.results.length === 0 &&
        search.glossaryResults.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="text-tech-main/60 text-sm">
              {search.t("noMatch")}
            </div>
            <div className="text-tech-main/40 mt-1 text-xs">
              {search.t("tryDifferentKeywords")}
            </div>
          </div>
        )}
      {search.query.length < 2 && (
        <div className="px-4 py-8 text-center">
          <div className="text-tech-main/60 text-sm">
            {search.t("awaitingInput")}
          </div>
          <div className="text-tech-main/40 mt-1 text-xs">
            {search.t("minCharsHint")}
          </div>
        </div>
      )}
    </CommandList>
  )
}
