"use client"

import * as React from "react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { GlossarySummaryEntry } from "@/lib/glossary/manifest"

const MAX_RESULTS = 10

interface PickerOptionProps {
  entry: GlossarySummaryEntry
  index: number
  optionIdPrefix: string
  isActive: boolean
  onPick: (slug: string) => void
  onHighlight: (index: number) => void
}

function PickerOption({
  entry,
  index,
  optionIdPrefix,
  isActive,
  onPick,
  onHighlight,
}: PickerOptionProps) {
  const handleClick = useCallback(() => {
    onPick(entry.slug)
  }, [onPick, entry.slug])

  const handleMouseEnter = useCallback(() => {
    onHighlight(index)
  }, [onHighlight, index])

  return (
    <li
      key={entry.slug}
      id={`${optionIdPrefix}-${index}`}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role
      role="option"
      aria-selected={isActive}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        tabIndex={-1}
        aria-label={entry.fullFormEn}
        className={`block w-full cursor-pointer px-4 py-2 text-left transition-colors ${
          isActive ? "bg-tech-main/10" : "hover:bg-tech-accent/10"
        }`}>
        <div className="text-tech-main-dark font-mono text-sm">
          {entry.fullFormEn}
        </div>
        <div className="text-tech-main/50 mt-0.5 font-mono text-xs">
          {entry.shortForm}
          {entry.shortForm && entry.category ? " · " : ""}
          {entry.category}
        </div>
      </button>
    </li>
  )
}

export interface GlossaryRowPickerProps {
  entries: GlossarySummaryEntry[]
  onPick: (slug: string) => void
  onAddNew: (query: string) => void
  className?: string
}

export function GlossaryRowPicker({
  entries,
  onPick,
  onAddNew,
  className = "",
}: GlossaryRowPickerProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const optionIdPrefix = useId()

  const trimmedQuery = query.trim()

  const results = useMemo(() => {
    if (!trimmedQuery) return []
    const needle = trimmedQuery.toLowerCase()
    const matches: GlossarySummaryEntry[] = []
    for (const entry of entries) {
      if (
        entry.fullFormEn.toLowerCase().includes(needle) ||
        entry.shortForm.toLowerCase().includes(needle)
      ) {
        matches.push(entry)
        if (matches.length >= MAX_RESULTS) break
      }
    }
    return matches
  }, [entries, trimmedQuery])

  const showNoMatch = isOpen && trimmedQuery.length > 0 && results.length === 0

  useEffect(() => {
    setHighlightedIndex(0)
  }, [results])

  useEffect(() => {
    if (!isOpen) return
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (
        target &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleDocClick)
    return () => document.removeEventListener("mousedown", handleDocClick)
  }, [isOpen])

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
      setIsOpen(true)
    },
    []
  )

  const handleFocus = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handlePick = useCallback(
    (slug: string) => {
      onPick(slug)
      setQuery("")
      setIsOpen(false)
      setHighlightedIndex(0)
    },
    [onPick]
  )

  const handleAddNew = useCallback(() => {
    if (!trimmedQuery) return
    onAddNew(trimmedQuery)
    setQuery("")
    setIsOpen(false)
    setHighlightedIndex(0)
  }, [onAddNew, trimmedQuery])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown": {
          if (results.length === 0) return
          e.preventDefault()
          if (!isOpen) setIsOpen(true)
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          )
          break
        }
        case "ArrowUp": {
          if (results.length === 0) return
          e.preventDefault()
          if (!isOpen) setIsOpen(true)
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          )
          break
        }
        case "Enter": {
          if (showNoMatch) {
            e.preventDefault()
            handleAddNew()
            return
          }
          const selected = results[highlightedIndex]
          if (selected) {
            e.preventDefault()
            handlePick(selected.slug)
          }
          break
        }
        case "Escape": {
          if (isOpen) {
            e.preventDefault()
            setIsOpen(false)
          }
          break
        }
      }
    },
    [results, highlightedIndex, isOpen, showNoMatch, handlePick, handleAddNew]
  )

  const activeOptionId =
    isOpen && results.length > 0
      ? `${optionIdPrefix}-${highlightedIndex}`
      : undefined

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="border-tech-main/40 focus-within:border-tech-main/70 bg-surface-input/50 flex items-stretch border transition-colors">
        <span
          aria-hidden="true"
          className="text-tech-main/60 flex items-center px-3 font-mono text-sm select-none">
          &gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          // oxlint-disable-next-line jsx-a11y/no-redundant-roles
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label="Search glossary terms"
          value={query}
          onChange={handleQueryChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="search terms…"
          autoComplete="off"
          spellCheck={false}
          className="text-tech-main-dark placeholder:text-tech-main/50 w-full bg-transparent py-2.5 pr-3 font-mono text-sm outline-none"
        />
      </div>

      {isOpen && (results.length > 0 || showNoMatch) && (
        <div className="border-tech-main/40 bg-surface-overlay/95 absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-y-auto border shadow-lg backdrop-blur-md">
          {results.length > 0 && (
            <ul
              id={listboxId}
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role
              role="listbox"
              aria-label="Matching glossary terms"
              className="py-1">
              {results.map((entry, index) => (
                <PickerOption
                  key={entry.slug}
                  entry={entry}
                  index={index}
                  optionIdPrefix={optionIdPrefix}
                  isActive={index === highlightedIndex}
                  onPick={handlePick}
                  onHighlight={setHighlightedIndex}
                />
              ))}
            </ul>
          )}

          {showNoMatch && (
            <div
              id={listboxId}
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
              role="listbox"
              aria-label="No matching glossary terms"
              className="px-4 py-3">
              <div className="text-tech-main/60 mb-2 font-mono text-xs tracking-wider uppercase">
                No matches
              </div>
              <button
                type="button"
                onClick={handleAddNew}
                className="border-tech-main/40 text-tech-main-dark hover:bg-tech-main tracking-tech-wide w-full cursor-pointer border px-3 py-2 font-mono text-xs uppercase transition-colors hover:text-white">
                [+ ADD AS NEW TERM]
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
