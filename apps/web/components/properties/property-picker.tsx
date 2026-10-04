"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
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
  multiple = false,
  onSelect,
}: {
  properties: PropertyInfo[]
  selected?: string[]
  label: string
  multiple?: boolean
  onSelect: (id: string) => void
}) {
  const t = useTranslations("Properties")
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-h-11" aria-expanded={open}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(28rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput
            placeholder={t("findProperty")}
            aria-label={t("findProperty")}
          />
          <CommandList className="max-h-80">
            <CommandEmpty>{t("noProperty")}</CommandEmpty>
            <CommandGroup
              heading={multiple ? t("columnLimit") : t("chooseProperty")}>
              {properties.map((property) => (
                <CommandItem
                  key={property.id}
                  disabled={
                    multiple &&
                    (selected.includes(property.id)
                      ? selected.length <= 1
                      : selected.length >= 8)
                  }
                  value={`${property.id} ${property.name} ${property.category} ${property.description}`}
                  onSelect={() => {
                    onSelect(property.id)
                    if (!multiple) setOpen(false)
                  }}
                  className="min-h-11 items-start py-3">
                  <Check
                    aria-hidden="true"
                    className={
                      selected.includes(property.id)
                        ? "mt-0.5 opacity-100"
                        : "mt-0.5 opacity-0"
                    }
                  />
                  <div className="min-w-0 space-y-1">
                    <span className="block font-medium">{property.name}</span>
                    {property.category && (
                      <span className="text-muted-foreground block text-xs">
                        {property.category}
                      </span>
                    )}
                    {property.description && (
                      <span className="text-muted-foreground block text-sm leading-relaxed">
                        {property.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
