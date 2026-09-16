"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/shadcn/popover"
import {
  Command,
  CommandList,
  CommandItem,
} from "@/components/ui/shadcn/command"
import { Separator } from "@/components/ui/shadcn/separator"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/shadcn/input-group"
import type { GlossarySummaryEntry } from "@/lib/glossary/manifest"
import { cn } from "@/lib/cn"

const MAX_RESULTS = 10

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

  const handlePick = useCallback(
    (slug: string) => {
      onPick(slug)
      setQuery("")
      setIsOpen(false)
    },
    [onPick]
  )

  const handleAddNew = useCallback(() => {
    if (!trimmedQuery) return
    onAddNew(trimmedQuery)
    setQuery("")
    setIsOpen(false)
  }, [onAddNew, trimmedQuery])

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <InputGroup className="w-full">
            <InputGroupAddon align="inline-start">
              <Search className="text-muted-foreground size-4" />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              aria-label="Search glossary terms"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search existing terms to edit…"
              autoComplete="off"
              spellCheck={false}
              className="text-sm font-normal"
            />
          </InputGroup>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="max-h-72 w-(--radix-popover-trigger-width) overflow-hidden p-0 shadow-md">
          <Command shouldFilter={false}>
            <CommandList className="max-h-72">
              {results.length > 0 &&
                results.map((entry) => (
                  <CommandItem
                    key={entry.slug}
                    value={entry.slug}
                    onSelect={() => handlePick(entry.slug)}
                    className="cursor-pointer px-3.5 py-2">
                    <div>
                      <div className="text-foreground text-sm font-medium">
                        {entry.fullFormEn}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                        {entry.shortForm && <span>{entry.shortForm}</span>}
                        {entry.shortForm && entry.categories.length > 0 && (
                          <Separator
                            orientation="vertical"
                            className="bg-muted-foreground/40 h-3"
                          />
                        )}
                        {entry.categories.length > 0 && (
                          <span>{entry.categories.join("; ")}</span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}

              {showNoMatch && (
                <CommandItem
                  value="__add_new__"
                  onSelect={handleAddNew}
                  className="border-border cursor-pointer border-t px-3.5 py-3">
                  <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                    <Plus className="text-tech-signal size-4" />
                    <span>Add &ldquo;{trimmedQuery}&rdquo; as new term</span>
                  </div>
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
