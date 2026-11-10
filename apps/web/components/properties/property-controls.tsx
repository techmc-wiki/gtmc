"use client"

import { useTranslations } from "next-intl"
import { Eye, EyeOff, Filter, FilterX, Plus, Search, X } from "lucide-react"
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
  type PropertyKind,
} from "@/lib/properties/types"
import { PropertyPicker } from "./property-picker"

const NUMBER_OPERATORS: FilterOperator[] = ["eq", "gte", "lte"]
const TEXT_OPERATORS: FilterOperator[] = ["eq", "contains"]
const MAX_COLUMNS = 8
/**
 * Select value for the "(None)" choice. Selects need a non-empty item value,
 * but choosing it stores an empty filter value, which leaves the condition
 * unapplied; the sentinel never reaches the query or the URL.
 */
const NO_VALUE = "__none__"

type Kind = "blocks" | "entities" | "items"

interface PropertyControlsProps {
  kind: Kind
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

/** Example query and filter per dataset, both guaranteed to return rows. */
const EXAMPLES: Record<Kind, { query: string; filter: string }> = {
  blocks: { query: "slime|honey", filter: "conductive" },
  entities: { query: "zombie|skeleton", filter: "fire_immune" },
  items: { query: "sword", filter: "renewable" },
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
  const selected = new Set(columns)
  return (
    <Card className="space-y-4">
      <PropertySearch
        kind={kind}
        query={state.q}
        properties={properties}
        columns={columns}
        onQueryChange={(q) => setState({ q, page: 1 })}
        toggleColumn={toggleColumn}
      />
      {!state.q && !state.filters.length && (
        <PropertyExamples
          kind={kind}
          byId={byId}
          setState={setState}
          addFilter={addFilter}
        />
      )}
      <section className="border-border space-y-3 border-t pt-4">
        <h2 className="flex items-center gap-2 font-sans text-sm font-semibold">
          {t("filters")}
          {state.filters.length > 0 && (
            <Badge variant="secondary">{state.filters.length}</Badge>
          )}
        </h2>
        <div className="space-y-2">
          {state.filters.length > 0 && (
            <div className="text-muted-foreground hidden gap-2 text-sm sm:grid sm:grid-cols-[2.75rem_2.75rem_minmax(0,14rem)_minmax(0,1fr)]">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span>{t("property")}</span>
              <span>{t("filterColumn")}</span>
            </div>
          )}
          {state.filters.map((filter) => (
            <PropertyFilterRow
              key={filter.id}
              filter={filter}
              byId={byId}
              properties={properties}
              selected={selected}
              columnCount={columns.length}
              toggleColumn={toggleColumn}
              onPatch={(patch) =>
                setState({
                  filters: state.filters.map((item) =>
                    item.id === filter.id ? { ...item, ...patch } : item
                  ),
                  page: 1,
                })
              }
              onRemove={() =>
                setState({
                  filters: state.filters.filter(
                    (item) => item.id !== filter.id
                  ),
                  page: 1,
                })
              }
            />
          ))}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={t("addCondition")}
              title={t("addCondition")}
              disabled={state.filters.length >= 8}
              onClick={() => addFilter("")}>
              <Plus aria-hidden="true" />
            </Button>
            {state.filters.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                aria-label={t("clearAllFilters")}
                title={t("clearAllFilters")}
                onClick={() => void setState({ filters: [], page: 1 })}>
                <FilterX aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </Card>
  )
}

interface PropertySearchProps {
  kind: Kind
  query: string
  properties: PropertyInfo[]
  columns: string[]
  onQueryChange: (query: string) => void
  toggleColumn: (id: string) => void
}

function PropertySearch({
  kind,
  query,
  properties,
  columns,
  onQueryChange,
  toggleColumn,
}: PropertySearchProps) {
  const t = useTranslations("Properties")
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-2">
        <Label htmlFor="property-search">{t("searchLabel")}</Label>
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id="property-search"
            value={query}
            maxLength={200}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t(`search_${kind}`)}
          />
          {query && (
            <InputGroupAddon align="inline-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onQueryChange("")}
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
        icon={Eye}
        count={columns.length}
        multiple
        onSelect={toggleColumn}
      />
    </div>
  )
}

interface PropertyExamplesProps {
  kind: Kind
  byId: Map<string, PropertyInfo>
  setState: PropertyControlsProps["setState"]
  addFilter: PropertyControlsProps["addFilter"]
}

function PropertyExamples({
  kind,
  byId,
  setState,
  addFilter,
}: PropertyExamplesProps) {
  const t = useTranslations("Properties")
  const example = EXAMPLES[kind]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">{t("try")}</span>
      <Button
        variant="secondary"
        size="sm"
        className="min-h-11"
        onClick={() => void setState({ q: example.query, page: 1 })}>
        {t(`example_${kind}`)}
      </Button>
      {byId.has(example.filter) && (
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11"
          onClick={() => addFilter(example.filter, "Yes")}>
          <Filter aria-hidden="true" />
          {t(`filterExample_${kind}`)}
        </Button>
      )}
    </div>
  )
}

interface PropertyFilterRowProps {
  filter: PropertyFilter
  byId: Map<string, PropertyInfo>
  properties: PropertyInfo[]
  selected: Set<string>
  columnCount: number
  toggleColumn: (id: string) => void
  onPatch: (patch: Partial<PropertyFilter>) => void
  onRemove: () => void
}

function PropertyFilterRow({
  filter,
  byId,
  properties,
  selected,
  columnCount,
  toggleColumn,
  onPatch,
  onRemove,
}: PropertyFilterRowProps) {
  const t = useTranslations("Properties")
  const info = byId.get(filter.property)
  const hasProperty = Boolean(filter.property)
  const propertyName = info?.name ?? filter.property
  const shown = hasProperty && selected.has(filter.property)
  const removeLabel = hasProperty
    ? t("removeFilter", { name: propertyName })
    : t("removeCondition")
  const visibilityLabel = hasProperty
    ? t(shown ? "hideColumn" : "showColumn", { name: propertyName })
    : t("columnVisibility")
  return (
    <div className="border-border grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)] items-center gap-2 border-b pb-2 sm:grid-cols-[2.75rem_2.75rem_minmax(0,14rem)_minmax(0,1fr)] sm:border-b-0 sm:pb-0">
      <Button
        variant="outline"
        size="icon"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={onRemove}>
        <X aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={!hasProperty || (!shown && columnCount >= MAX_COLUMNS)}
        aria-label={visibilityLabel}
        title={visibilityLabel}
        onClick={() => toggleColumn(filter.property)}>
        {shown ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
      </Button>
      <PropertyPicker
        properties={properties}
        selected={hasProperty ? [filter.property] : []}
        label={hasProperty ? propertyName : t("selectProperty")}
        onSelect={(property) =>
          onPatch({ property, operator: "eq", value: "" })
        }
      />
      <FilterCondition
        filter={filter}
        info={info}
        hasProperty={hasProperty}
        propertyName={propertyName}
        onPatch={onPatch}
      />
    </div>
  )
}

interface FilterConditionProps {
  filter: PropertyFilter
  info: PropertyInfo | undefined
  hasProperty: boolean
  propertyName: string
  onPatch: (patch: Partial<PropertyFilter>) => void
}

function FilterCondition({
  filter,
  info,
  hasProperty,
  propertyName,
  onPatch,
}: FilterConditionProps) {
  const t = useTranslations("Properties")
  const operators = operatorsFor(info?.kind)
  return (
    <div className="col-span-3 flex flex-wrap items-center gap-2 sm:col-span-1">
      {operators && (
        <Select
          value={filter.operator}
          disabled={!hasProperty}
          onValueChange={(operator) => {
            if (FILTER_OPERATORS.includes(operator as FilterOperator)) {
              onPatch({ operator: operator as FilterOperator })
            }
          }}>
          <SelectTrigger
            className="min-h-11 w-full min-w-0 sm:w-36"
            aria-label={
              hasProperty ? `${propertyName} ${t("operator")}` : t("operator")
            }>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {t(`op_${operator}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <FilterValueField
        info={info}
        value={filter.value}
        disabled={!hasProperty}
        propertyName={propertyName}
        hasProperty={hasProperty}
        onChange={(value) => onPatch({ value })}
      />
      {info?.kind === "tags" && (
        <TagPresenceSelect
          value={filter.value ? (filter.operator === "ne" ? "ne" : "eq") : null}
          disabled={!hasProperty || !filter.value}
          onChange={(operator) =>
            onPatch(operator ? { operator } : { value: "" })
          }
        />
      )}
    </div>
  )
}

/** Operator choices a property kind supports; null means typed text. */
function operatorsFor(kind: PropertyKind | undefined): FilterOperator[] | null {
  if (kind === "number") return NUMBER_OPERATORS
  if (kind && kind !== "text") return null
  return TEXT_OPERATORS
}

interface FilterValueFieldProps {
  info: PropertyInfo | undefined
  value: string
  disabled: boolean
  hasProperty: boolean
  propertyName: string
  onChange: (value: string) => void
}

function FilterValueField({
  info,
  value,
  disabled,
  hasProperty,
  propertyName,
  onChange,
}: FilterValueFieldProps) {
  const t = useTranslations("Properties")
  if (info?.kind === "number") {
    return (
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        className="h-11 w-full min-w-0 py-0 sm:max-w-64 sm:py-0"
        value={value}
        disabled={disabled}
        placeholder={t("numberPlaceholder")}
        aria-label={t("filterValueFor", { name: propertyName })}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  if (
    info?.kind === "enum" ||
    info?.kind === "boolean" ||
    info?.kind === "tags"
  ) {
    const valueLabel = info.kind === "tags" ? t("selectTag") : t("selectValue")
    return (
      <Select
        value={value || NO_VALUE}
        disabled={disabled}
        onValueChange={(next) => onChange(next === NO_VALUE ? "" : next)}>
        <SelectTrigger
          className="min-h-11 w-full min-w-0 sm:w-56"
          aria-label={valueLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_VALUE}>
            <span className="text-muted-foreground">{t("none")}</span>
          </SelectItem>
          {(info.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      className="h-11 w-full min-w-0 py-0 sm:max-w-64 sm:py-0"
      value={value}
      maxLength={200}
      disabled={disabled}
      placeholder={t("filterValue")}
      aria-label={
        hasProperty
          ? t("filterValueFor", { name: propertyName })
          : t("filterValue")
      }
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

interface TagPresenceSelectProps {
  /** Null while the filter has no tag chosen, so no presence applies. */
  value: "eq" | "ne" | null
  disabled: boolean
  onChange: (operator: "eq" | "ne" | null) => void
}

function TagPresenceSelect({
  value,
  disabled,
  onChange,
}: TagPresenceSelectProps) {
  const t = useTranslations("Properties")
  return (
    <Select
      value={value ?? NO_VALUE}
      disabled={disabled}
      onValueChange={(next) =>
        onChange(next === NO_VALUE ? null : next === "ne" ? "ne" : "eq")
      }>
      <SelectTrigger
        className="min-h-11 w-full min-w-0 sm:w-28"
        aria-label={t("tagPresence")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_VALUE}>
          <span className="text-muted-foreground">{t("none")}</span>
        </SelectItem>
        <SelectItem value="eq">{t("yes")}</SelectItem>
        <SelectItem value="ne">{t("no")}</SelectItem>
      </SelectContent>
    </Select>
  )
}
