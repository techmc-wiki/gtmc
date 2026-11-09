"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/shadcn/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/shadcn/command"
import type { PropertyInfo } from "@/lib/properties/types"

const NO_SELECTION: string[] = []

export function PropertyPicker({
  properties,
  selected = NO_SELECTION,
  label,
  count,
  multiple = false,
  onSelect,
}: {
  properties: PropertyInfo[]
  selected?: string[]
  label: string
  count?: number
  multiple?: boolean
  onSelect: (id: string) => void
}) {
  const t = useTranslations("Properties")
  const [open, setOpen] = useState(false)
  const selectedIds = new Set(selected)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="min-h-11 min-w-0 justify-between"
          aria-expanded={open}>
          <span className="truncate text-left">{label}</span>
          {count !== undefined && <Badge variant="secondary">{count}</Badge>}
          <ChevronsUpDown aria-hidden="true" className="shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(40rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput
            placeholder={t("findProperty")}
            aria-label={t("findProperty")}
          />
          <CommandList className="max-h-96">
            <CommandEmpty>{t("noProperty")}</CommandEmpty>
            <CommandGroup
              heading={multiple ? t("columnLimit") : t("chooseProperty")}
              className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:gap-1 sm:[&_[cmdk-group-items]]:grid-cols-2">
              {properties.map((property) => (
                <CommandItem
                  key={property.id}
                  disabled={
                    multiple &&
                    (selectedIds.has(property.id)
                      ? selected.length <= 1
                      : selected.length >= 8)
                  }
                  value={`${property.id} ${property.name} ${property.category} ${property.description}`}
                  title={property.description || undefined}
                  onSelect={() => {
                    onSelect(property.id)
                    if (!multiple) setOpen(false)
                  }}
                  className="min-h-11 items-start px-2 py-2">
                  <Check
                    aria-hidden="true"
                    className={
                      selectedIds.has(property.id)
                        ? "mt-0.5 shrink-0 opacity-100"
                        : "mt-0.5 shrink-0 opacity-0"
                    }
                  />
                  <span className="min-w-0">
                    <span className="line-clamp-2 block leading-snug font-medium">
                      {property.name}
                    </span>
                    {property.category && (
                      <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                        {property.category}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
