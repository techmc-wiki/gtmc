"use client"

import { useTranslations } from "next-intl"
import { Filter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import { Card } from "@/components/ui/shadcn/card"
import { Input } from "@/components/ui/shadcn/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/shadcn/input-group"
import { Label } from "@/components/ui/shadcn/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/shadcn/select"
import {
  FILTER_OPERATORS,
  type FilterOperator,
  type PropertyFilter,
  type PropertyInfo,
} from "@/lib/properties/types"
import { PropertyPicker } from "./property-picker"

interface PropertyControlsProps {
  kind: "blocks" | "entities" | "items"
  state: { q: string; filters: PropertyFilter[] }
  setState: (patch: {
    q?: string
    filters?: PropertyFilter[]
    page: number
  }) => void
  columns: string[]
  properties: PropertyInfo[]
  byId: Map<string, PropertyInfo>
  toggleColumn: (id: string) => void
  addFilter: (
    property: string,
    value?: string,
    operator?: FilterOperator
  ) => void
}

export function PropertyControls({
  kind,
  state,
  setState,
  columns,
  properties,
  byId,
  toggleColumn,
  addFilter,
}: PropertyControlsProps) {
  const t = useTranslations("Properties")
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 space-y-2">
          <Label htmlFor="property-search">{t("searchLabel")}</Label>
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="property-search"
              value={state.q}
              maxLength={200}
              onChange={(event) =>
                void setState({ q: event.target.value, page: 1 })
              }
              placeholder={t(`search_${kind}`)}
              aria-describedby="property-search-help"
            />
            {state.q && (
              <InputGroupAddon align="inline-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void setState({ q: "", page: 1 })}
                  aria-label={t("clearSearch")}>
                  <X aria-hidden="true" />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
        <PropertyPicker
          properties={properties}
          selected={columns}
          label={t("columns", { count: columns.length })}
          multiple
          onSelect={toggleColumn}
        />
        <PropertyPicker
          properties={state.filters.length < 8 ? properties : []}
          label={t("addFilter")}
          onSelect={addFilter}
        />
      </div>
      <p id="property-search-help" className="text-muted-foreground text-sm">
        {t("searchHelp")}
      </p>
      {!state.q && !state.filters.length && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">{t("try")}</span>
          <Button
            variant="secondary"
            size="sm"
            className="min-h-11"
            onClick={() =>
              void setState({
                q:
                  kind === "blocks"
                    ? "slime|honey"
                    : kind === "entities"
                      ? "zombie|skeleton"
                      : "sword",
                page: 1,
              })
            }>
            {t(`example_${kind}`)}
          </Button>
          {byId.has(
            kind === "blocks"
              ? "conductive"
              : kind === "entities"
                ? "fire_immune"
                : "renewable"
          ) && (
            <Button
              variant="secondary"
              size="sm"
              className="min-h-11"
              onClick={() =>
                addFilter(
                  kind === "blocks"
                    ? "conductive"
                    : kind === "entities"
                      ? "fire_immune"
                      : "renewable",
                  "Yes"
                )
              }>
              <Filter aria-hidden="true" />
              {t(`filterExample_${kind}`)}
            </Button>
          )}
        </div>
      )}
      {state.filters.map((filter) => (
        <div
          key={filter.id}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 sm:flex sm:flex-wrap">
          <Label
            htmlFor={`filter-${filter.id}`}
            className="col-span-3 min-w-0 sm:min-w-40">
            {byId.get(filter.property)?.name ?? filter.property}
          </Label>
          <Select
            value={filter.operator}
            onValueChange={(operator) => {
              if (FILTER_OPERATORS.includes(operator as FilterOperator)) {
                void setState({
                  filters: state.filters.map((item) =>
                    item.id === filter.id
                      ? { ...item, operator: operator as FilterOperator }
                      : item
                  ),
                  page: 1,
                })
              }
            }}>
            <SelectTrigger
              className="min-h-11 w-full min-w-0 sm:w-fit"
              aria-label={t("operator")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPERATORS.map((operator) => (
                <SelectItem key={operator} value={operator}>
                  {t(`op_${operator}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id={`filter-${filter.id}`}
            className="w-full min-w-0 sm:w-40 sm:flex-none"
            value={filter.value}
            maxLength={200}
            placeholder={t("filterValue")}
            onChange={(event) =>
              void setState({
                filters: state.filters.map((item) =>
                  item.id === filter.id
                    ? { ...item, value: event.target.value }
                    : item
                ),
                page: 1,
              })
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("removeFilter", {
              name: byId.get(filter.property)?.name ?? filter.property,
            })}
            onClick={() =>
              void setState({
                filters: state.filters.filter((item) => item.id !== filter.id),
                page: 1,
              })
            }>
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}
      {state.filters.length > 0 && (
        <p className="text-muted-foreground text-sm">{t("filterHelp")}</p>
      )}
    </Card>
  )
}
