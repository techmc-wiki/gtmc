"use client"

import { useTranslations } from "next-intl"
import { Filter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
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
          label={t("columns")}
          count={columns.length}
          multiple
          onSelect={toggleColumn}
        />
      </div>
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
      <section className="border-border space-y-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-sans text-sm font-semibold">
            {t("filters")}
            {state.filters.length > 0 && (
              <Badge variant="secondary">{state.filters.length}</Badge>
            )}
          </h2>
          <PropertyPicker
            properties={state.filters.length < 8 ? properties : []}
            label={t("addFilter")}
            onSelect={addFilter}
          />
        </div>
        {state.filters.length > 0 && (
          <div className="space-y-2">
            <div className="text-muted-foreground hidden gap-2 text-sm sm:grid sm:grid-cols-[2.75rem_minmax(0,14rem)_minmax(0,1fr)]">
              <span aria-hidden="true" />
              <span>{t("property")}</span>
              <span>{t("filterColumn")}</span>
            </div>
            {state.filters.map((filter) => {
              const propertyName =
                byId.get(filter.property)?.name ?? filter.property
              function patchFilter(patch: Partial<PropertyFilter>) {
                void setState({
                  filters: state.filters.map((item) =>
                    item.id === filter.id ? { ...item, ...patch } : item
                  ),
                  page: 1,
                })
              }
              return (
                <div
                  key={filter.id}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[2.75rem_minmax(0,14rem)_minmax(0,1fr)]">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label={t("removeFilter", { name: propertyName })}
                    onClick={() =>
                      void setState({
                        filters: state.filters.filter(
                          (item) => item.id !== filter.id
                        ),
                        page: 1,
                      })
                    }>
                    <X aria-hidden="true" />
                  </Button>
                  <PropertyPicker
                    properties={properties}
                    selected={[filter.property]}
                    label={propertyName}
                    onSelect={(property) => patchFilter({ property })}
                  />
                  <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1">
                    <Select
                      value={filter.operator}
                      onValueChange={(operator) => {
                        if (
                          FILTER_OPERATORS.includes(operator as FilterOperator)
                        ) {
                          patchFilter({
                            operator: operator as FilterOperator,
                          })
                        }
                      }}>
                      <SelectTrigger
                        className="min-h-11 w-full min-w-0 sm:w-fit"
                        aria-label={`${propertyName} ${t("operator")}`}>
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
                      className="w-full min-w-0 sm:max-w-64"
                      value={filter.value}
                      maxLength={200}
                      placeholder={t("filterValue")}
                      aria-label={t("filterValueFor", { name: propertyName })}
                      onChange={(event) =>
                        patchFilter({ value: event.target.value })
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </Card>
  )
}
