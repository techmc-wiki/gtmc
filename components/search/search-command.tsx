"use client"

import * as React from "react"
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react"
import { createPortal } from "react-dom"
import { useRouter, usePathname } from "next/navigation"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface SearchResult {
  title: string
  slug: string
  snippet: string | null
  matchType: "title" | "content"
}

const emptySubscribe = () => () => {}

export function SearchCommand() {
  const [isOpen, setIsOpen] = useState(false)
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setQuery("")
    setResults([])
    setSelectedIndex(0)
    setIsLoading(false)
  }, [])

  // Global Cmd+K / Ctrl+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen((prev) => {
          if (prev) {
            // Closing — reset state synchronously
            setQuery("")
            setResults([])
            setSelectedIndex(0)
            setIsLoading(false)
          }
          return !prev
        })
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

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

      fetch(`/api/articles/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (!controller.signal.aborted) {
            setResults(data.results || [])
            setIsLoading(false)
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setIsLoading(false)
          }
        })
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [query])

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)
      setSelectedIndex(0)
      if (!value || value.length < 2) {
        setResults([])
        setIsLoading(false)
      }
    },
    []
  )

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
      const encodedSlug = result.slug
        .split("/")
        .map(encodeURIComponent)
        .join("/")
      const highlightParam =
        result.snippet && query.trim().length >= 2
          ? `?highlight=${encodeURIComponent(query.trim())}`
          : ""
      router.push(`/articles/${encodedSlug}${highlightParam}`)
    },
    [router, closeModal, query, pathname]
  )

  // Keyboard navigation inside modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
          break
        case "Enter":
          e.preventDefault()
          if (results[selectedIndex]) {
            navigateToResult(results[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          closeModal()
          break
      }
    },
    [results, selectedIndex, navigateToResult, closeModal]
  )

  // Highlight matched text in title/snippet
  const highlightMatch = useCallback(
    (text: string) => {
      if (!query || query.length < 2) return text
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`(${escapedQuery})`, "gi")
      const parts = text.split(regex)
      return parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-tech-main/20 px-0.5 text-tech-main-dark">
            {part}
          </mark>
        ) : (
          part
        )
      )
    },
    [query]
  )

  // Derive path breadcrumb from slug
  const slugToPath = (slug: string) => {
    return "/" + slug
  }

  // Platform-aware shortcut label
  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl+K"
    return navigator.platform?.toLowerCase().includes("mac") ? (
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
        className="
          hidden cursor-pointer items-center gap-2 border border-tech-main/40
          px-3 py-1.5 font-mono text-[11px] text-tech-main/60 transition-colors
          hover:bg-tech-main hover:text-white
          md:flex
        ">
        <span className="text-xs">&#x2315;</span>
        SEARCH
        <span
          className="
            ml-1 border border-tech-main/30 px-1 py-0.5 text-[9px]
            text-tech-main/40
          ">
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
        onClick={() => setIsOpen(true)}
        className="
          hidden cursor-pointer items-center gap-2 border border-tech-main/40
          px-3 py-1.5 font-mono text-[11px] text-tech-main/60 transition-colors
          hover:bg-tech-main hover:text-white
          md:flex
        ">
        <span className="text-sm leading-none">&#x2315;</span>
        SEARCH
        <div className="w-4" />
        <span
          className="
            ml-1 border border-tech-main/30 px-1 py-0.5 text-[9px]
            text-tech-main/40
          ">
          {shortcutLabel}
        </span>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="
          flex min-h-11 min-w-11 cursor-pointer items-center justify-center p-2
          font-mono text-[2.5rem] text-tech-main transition-colors
          hover:bg-tech-main/10
          md:hidden
        "
        aria-label="Search articles">
        &#x2315;
      </button>

      {/* Search modal (portal) */}
      {isOpen &&
        createPortal(
          <div
            className="
              fixed inset-0 z-9999 flex items-start justify-center bg-black/80
              p-4 pt-[10vh] duration-200 animate-in fade-in
              sm:pt-[15vh]
            "
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal()
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Search articles">
            <div
              className="
                relative w-full max-w-xl border-2 border-tech-main bg-white
                shadow-[8px_8px_0_0_rgba(96,112,143,1)] duration-200 animate-in
                slide-in-from-top-4
              "
              onKeyDown={handleKeyDown}>
              <CornerBrackets variant="static" />

              {/* Header */}
              <div
                className="
                  flex items-center justify-between border-b guide-line px-4
                  py-3
                ">
                <div
                  className="
                    flex items-center gap-2 font-mono text-xs font-bold
                    tracking-tech-wide text-tech-main/60 uppercase
                  ">
                  <span
                    className="
                      inline-block size-1.5 animate-pulse bg-tech-main/60
                    "
                  />
                  SYS.QUERY_ENGINE
                </div>
                <button
                  onClick={closeModal}
                  className="
                    cursor-pointer border border-tech-main/30 px-2 py-0.5
                    font-mono text-[10px] text-tech-main/50 transition-colors
                    hover:bg-tech-main hover:text-white
                  ">
                  ESC
                </button>
              </div>

              {/* Search input */}
              <div className="border-b guide-line px-4 py-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Search articles by title or content..."
                  className="
                    w-full border border-tech-main/30 bg-white/50 px-3 py-2.5
                    font-mono text-sm text-tech-main-dark transition-colors
                    outline-none
                    placeholder:text-tech-main/30
                    focus:border-tech-main
                  "
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {/* Results area */}
              <div className="custom-left-scrollbar max-h-[50vh] overflow-y-auto">
                {/* Status line */}
                {query.length >= 2 && (
                  <div
                    className="
                      border-b guide-line px-4 py-2 font-mono text-[10px]
                      tracking-wider text-tech-main/50 uppercase
                    ">
                    {isLoading
                      ? "SCANNING\u2026"
                      : results.length === 20
                        ? `SCAN_RESULTS (${results.length} - TOP MATCHES)`
                        : `SCAN_RESULTS (${results.length})`}
                  </div>
                )}

                {/* Loading state */}
                {isLoading && (
                  <div className="px-4 py-6">
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-1.5">
                          <div
                            className="
                            h-4 w-3/5 animate-pulse bg-tech-main/10
                          "
                          />
                          <div
                            className="
                            h-3 w-2/5 animate-pulse bg-tech-main/5
                          "
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results list */}
                {!isLoading && results.length > 0 && (
                  <ul className="py-1">
                    {results.map((result, index) => (
                      <li key={result.slug}>
                        <button
                          onClick={() => navigateToResult(result)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`
                            group relative w-full cursor-pointer px-4 py-3
                            text-left transition-colors
                            ${
                              index === selectedIndex
                                ? "bg-tech-main/10"
                                : "hover:bg-tech-accent/10"
                            }
                          `}
                          aria-label={`Select ${result.title}`}
                          tabIndex={-1}>
                          {index === selectedIndex && (
                            <CornerBrackets
                              variant="static"
                              color="border-tech-main/30"
                            />
                          )}

                          {/* Title */}
                          <div
                            className="
                              font-mono text-sm font-medium text-tech-main-dark
                            ">
                            {highlightMatch(result.title)}
                          </div>

                          {/* Path */}
                          <div
                            className="
                              mt-0.5 font-mono text-[10px] tracking-wider
                              text-tech-main/40 uppercase
                            ">
                            PATH: {slugToPath(result.slug)}
                          </div>

                          {/* Content snippet */}
                          {result.snippet && (
                            <div
                              className="
                              mt-1 text-xs/relaxed text-tech-main/60
                            ">
                              {highlightMatch(result.snippet)}
                            </div>
                          )}

                          {/* Match type badge */}
                          <div
                            className="
                              absolute top-3 right-4 font-mono text-[9px]
                              tracking-wider text-tech-main/30 uppercase
                            ">
                            {result.matchType === "content" ? "BODY" : "TITLE"}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Empty state */}
                {!isLoading && query.length >= 2 && results.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <div
                      className="
                        font-mono text-xs tracking-wider text-tech-main/40
                        uppercase
                      ">
                      NO_MATCH_FOUND
                    </div>
                    <div
                      className="
                      mt-1 font-mono text-[10px] text-tech-main/30
                    ">
                      Try different keywords
                    </div>
                  </div>
                )}

                {/* Initial state */}
                {query.length < 2 && (
                  <div className="px-4 py-8 text-center">
                    <div
                      className="
                        font-mono text-xs tracking-wider text-tech-main/30
                        uppercase
                      ">
                      AWAITING_INPUT
                    </div>
                    <div
                      className="
                      mt-1 font-mono text-[10px] text-tech-main/25
                    ">
                      Type at least 2 characters
                    </div>
                  </div>
                )}
              </div>

              {/* Footer hints */}
              <div
                className="
                  flex items-center gap-4 border-t guide-line px-4 py-2
                  font-mono text-[10px] text-tech-main/40
                ">
                <span>
                  <kbd className="border guide-line px-1">&#x2191;&#x2193;</kbd>{" "}
                  NAVIGATE
                </span>
                <span>
                  <kbd className="border guide-line px-1">&#x23CE;</kbd> OPEN
                </span>
                <span>
                  <kbd className="border guide-line px-1">ESC</kbd> DISMISS
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
