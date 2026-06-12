"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { articleUrl } from "@/lib/articles/url"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { useMounted } from "@/hooks/use-mounted"
import { useModalEffects } from "@/hooks/use-modal-effects"

interface SearchResult {
  title: string
  slug: string
  snippet: string | null
  matchType: "title" | "content"
}

function slugToPath(slug: string) {
  return "/" + slug
}

export function SearchCommand() {
  const t = useTranslations("Search")
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const isMounted = useMounted()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
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

  const openModal = useCallback(() => {
    setIsOpen(true)
  }, [])

  useModalEffects({ isOpen, onClose: closeModal })

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
            setSelectedIndex(0)
            setIsLoading(false)
          }
          return !prev
        })
      }
    }
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [])

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || results.length === 0) return

    const container = resultsContainerRef.current
    if (!container) return

    const selectedItem = container.querySelector<HTMLElement>(
      `[data-search-result-index="${selectedIndex}"]`
    )

    selectedItem?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    })
  }, [isOpen, results, selectedIndex])

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
    }
  }, [query, locale])

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
      const highlightParam =
        result.snippet && query.trim().length >= 2
          ? `?highlight=${encodeURIComponent(query.trim())}`
          : ""
      router.push(`${articleUrl(result.slug)}${highlightParam}`)
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

  const handleResultClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const index = Number(e.currentTarget.dataset.searchResultIndex)
      if (results[index]) {
        navigateToResult(results[index])
      }
    },
    [results, navigateToResult]
  )

  const handleResultMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const index = Number(e.currentTarget.dataset.searchResultIndex)
      setSelectedIndex(index)
    },
    []
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
        type="button"
        className="border-tech-main/40 text-tech-main/60 hover:bg-tech-main-dark hover:text-tech-bg hidden cursor-pointer items-center gap-2 border px-3 py-1.5 font-mono text-[0.6875rem] transition-colors md:flex">
        <span className="text-xs">&#x2315;</span>
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
        className="border-tech-main/40 text-tech-main/60 hover:bg-tech-main-dark hover:text-tech-bg hidden h-8 w-40 cursor-pointer items-center gap-2 border px-3 py-1.5 font-mono text-[0.6875rem] transition-colors md:flex">
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-1 text-lg leading-none">
            &#x2315;{/* icon */}
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
        className="text-tech-main hover:bg-tech-main/10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center p-2 font-mono text-[2.5rem] transition-colors md:hidden"
        aria-label={t("searchAriaLabel")}>
        &#x2315;
      </button>

      {/* Search modal (portal) */}
      {isOpen &&
        createPortal(
          <dialog
            open
            className="animate-in fade-in fixed inset-0 z-[9999] m-0 flex h-screen max-h-none w-screen max-w-none items-start justify-center overflow-y-auto bg-black/80 p-4 pt-[10vh] duration-200 supports-[height:100dvh]:h-dvh supports-[width:100dvw]:w-dvw sm:pt-[15vh]"
            aria-modal="true"
            aria-label={t("searchAriaLabel")}>
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label={t("dismissHint")}
              onClick={closeModal}
              tabIndex={-1}
            />
            <section
              aria-label={t("searchAriaLabel")}
              className="border-tech-main animate-in slide-in-from-top-4 bg-surface-modal/95 relative w-full max-w-xl border shadow-xl backdrop-blur-md duration-200">
              <CornerBrackets variant="static" />

              {/* Header */}
              <header className="guide-line flex items-center justify-between border-b px-4 py-3">
                <div className="tracking-tech-wide text-tech-main/80 flex items-center gap-2 font-mono text-xs font-bold uppercase">
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
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleKeyDown}
                  placeholder={t("placeholder")}
                  aria-label={t("searchAriaLabel")}
                  className="border-tech-main/40 text-tech-main-dark placeholder:text-tech-main/50 focus:border-tech-main/70 bg-surface-input/60 focus:bg-surface-input/80 w-full border px-3 py-2.5 font-mono text-sm transition-colors outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {/* Results area */}
              <div
                ref={resultsContainerRef}
                className="custom-left-scrollbar max-h-[50vh] overflow-y-auto">
                {/* Status line */}
                {query.length >= 2 && (
                  <div className="guide-line text-tech-main/70 border-b px-4 py-2 font-mono text-[0.625rem] tracking-wider uppercase">
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
                  <ul className="py-1">
                    {results.map((result, index) => (
                      <li key={result.slug}>
                        <button
                          type="button"
                          onClick={handleResultClick}
                          onMouseEnter={handleResultMouseEnter}
                          data-search-result-index={index}
                          className={`group relative w-full cursor-pointer px-4 py-3 text-left transition-colors ${
                            index === selectedIndex
                              ? "bg-tech-main/10"
                              : "hover:bg-tech-accent/10"
                          } `}
                          aria-label={t("selectResult", {
                            title: result.title,
                          })}
                          tabIndex={-1}>
                          {index === selectedIndex && (
                            <CornerBrackets
                              variant="static"
                              color="border-tech-main/30"
                            />
                          )}

                          {/* Title */}
                          <div className="text-tech-main-dark font-mono text-sm font-medium">
                            {highlightMatch(result.title)}
                          </div>

                          {/* Path */}
                          <div className="text-tech-main/60 mt-0.5 font-mono text-[0.625rem] tracking-wider uppercase">
                            {t("pathLabel")} {slugToPath(result.slug)}
                          </div>

                          {/* Content snippet */}
                          {result.snippet && (
                            <div className="text-tech-main/70 mt-1 text-xs/relaxed">
                              {highlightMatch(result.snippet)}
                            </div>
                          )}

                          {/* Match type badge */}
                          <div className="text-tech-main/50 absolute top-3 right-4 font-mono text-[0.5625rem] tracking-wider uppercase">
                            {result.matchType === "content"
                              ? t("matchBody")
                              : t("matchTitle")}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Empty state */}
                {!isLoading && query.length >= 2 && results.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <div className="text-tech-main/60 font-mono text-xs tracking-wider uppercase">
                      {t("noMatch")}
                    </div>
                    <div className="text-tech-main/40 mt-1 font-mono text-[0.625rem]">
                      {t("tryDifferentKeywords")}
                    </div>
                  </div>
                )}

                {/* Initial state */}
                {query.length < 2 && (
                  <div className="px-4 py-8 text-center">
                    <div className="text-tech-main/60 font-mono text-xs tracking-wider uppercase">
                      {t("awaitingInput")}
                    </div>
                    <div className="text-tech-main/40 mt-1 font-mono text-[0.625rem]">
                      {t("minCharsHint")}
                    </div>
                  </div>
                )}
              </div>

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
            </section>
          </dialog>,
          document.body
        )}
    </>
  )
}
