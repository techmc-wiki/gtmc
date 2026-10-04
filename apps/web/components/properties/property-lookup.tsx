"use client"

import { useEffect, useState, type ReactNode } from "react"
import useSWRImmutable from "swr/immutable"
import { useTranslations } from "next-intl"
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsJson,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import { z } from "zod"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  GitCompareArrows,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
import { Card } from "@/components/ui/shadcn/card"
import { Checkbox } from "@/components/ui/shadcn/checkbox"
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
import { Skeleton } from "@/components/ui/shadcn/skeleton"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/shadcn/tabs"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/shadcn/table"
import {
  DATASETS,
  FILTER_OPERATORS,
  type DatasetId,
  type FilterOperator,
  type PropertyCatalog,
  type PropertyResults,
} from "@/lib/properties/types"
import { PropertyPicker } from "./property-picker"
import { PropertyValueView } from "./property-value"
import {
  PropertyDetails,
  PropertyComparison,
  propertyFetcher,
} from "./property-details"

const filtersParser = parseAsJson(
  z
    .array(
      z.object({
        id: z.string().max(50),
        property: z.string().max(150),
        operator: z.enum(FILTER_OPERATORS),
        value: z.string().max(200),
      })
    )
    .max(8)
).withDefault([])

function SourceLink(chunks: ReactNode) {
  return (
    <a
      href="https://github.com/JoakimThorsen/MCPropertyEncyclopedia"
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4">
      {chunks}
    </a>
  )
}

function useDebounced(value: string) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 200)
    return () => clearTimeout(timer)
  }, [value])
  return debounced
}

export function PropertyLookup({
  initialCatalog,
}: {
  initialCatalog: PropertyCatalog
}) {
  const t = useTranslations("Properties")
  const [state, setState] = useQueryStates({
    dataset: parseAsStringLiteral(DATASETS).withDefault("blocks"),
    q: parseAsString.withDefault(""),
    columns: parseAsArrayOf(parseAsString).withDefault([]),
    filters: filtersParser,
    sort: parseAsString.withDefault(""),
    direction: parseAsStringLiteral(["asc", "desc"]).withDefault("asc"),
    page: parseAsInteger.withDefault(1),
    entry: parseAsString,
    compare: parseAsArrayOf(parseAsString).withDefault([]),
  })
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const catalogKey = `/api/properties?dataset=${state.dataset}&mode=catalog`
  const {
    data: catalog,
    error: catalogError,
    mutate: reloadCatalog,
  } = useSWRImmutable<PropertyCatalog>(catalogKey, propertyFetcher, {
    fallbackData:
      state.dataset === initialCatalog.dataset ? initialCatalog : undefined,
  })
  const columns = state.columns.length
    ? state.columns.slice(0, 8)
    : (catalog?.defaults ?? [])
  const selected = state.compare.slice(0, 4)
  const parameters = new URLSearchParams({
    dataset: state.dataset,
    q: state.q.slice(0, 200),
    columns: columns.join(","),
    filters: JSON.stringify(state.filters),
    sort: state.sort,
    direction: state.direction,
    page: String(Math.max(1, state.page)),
  })
  const queryKey = useDebounced(`/api/properties?${parameters}`)
  const {
    data: results,
    error,
    isLoading,
    mutate,
  } = useSWRImmutable<PropertyResults>(
    catalog && queryKey.includes(`dataset=${state.dataset}&`) ? queryKey : null,
    propertyFetcher
  )
  const pending = isLoading || queryKey !== `/api/properties?${parameters}`
  const properties = (catalog?.properties ?? []).toSorted((a, b) => {
    const left = columns.indexOf(a.id)
    const right = columns.indexOf(b.id)
    return (left < 0 ? 8 : left) - (right < 0 ? 8 : right)
  })
  const byId = new Map(properties.map((property) => [property.id, property]))
  const kind =
    state.dataset === "entities" || state.dataset === "items"
      ? state.dataset
      : "blocks"

  function changeDataset(dataset: DatasetId) {
    void setState({
      dataset,
      columns: [],
      filters: [],
      sort: "",
      direction: "asc",
      page: 1,
      entry: null,
      compare: [],
    })
    setComparisonOpen(false)
  }
  function toggleColumn(id: string) {
    const next = columns.includes(id)
      ? columns.filter((column) => column !== id)
      : columns.length < 8
        ? [...columns, id]
        : columns
    if (next.length) void setState({ columns: next, page: 1 })
  }
  function addFilter(
    property: string,
    value = "",
    operator: FilterOperator = "eq"
  ) {
    if (state.filters.length < 8) {
      void setState({
        filters: [
          ...state.filters,
          { id: crypto.randomUUID(), property, operator, value },
        ],
        page: 1,
      })
    }
  }
  function sortBy(id: string) {
    void setState({
      sort: id,
      direction:
        state.sort === id && state.direction === "asc" ? "desc" : "asc",
      page: 1,
    })
  }
  function toggleCompare(name: string) {
    void setState({
      compare: selected.includes(name)
        ? selected.filter((item) => item !== name)
        : [...selected, name].slice(0, 4),
    })
  }
  function clearFilters() {
    void setState({ q: "", filters: [], page: 1 })
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground max-w-3xl text-base leading-relaxed">
        {t("intro")}
      </p>
      <Tabs
        value={kind}
        onValueChange={(value) =>
          changeDataset(value as "blocks" | "entities" | "items")
        }>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <TabsList className="gap-2">
            {(["blocks", "entities", "items"] as const).map((id) => (
              <TabsTrigger key={id} value={id} className="min-h-11">
                {t(id)}
              </TabsTrigger>
            ))}
          </TabsList>
          {kind === "blocks" && (
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="property-dataset">{t("dataset")}</Label>
              <Select
                value={state.dataset}
                onValueChange={(value) => {
                  if (
                    value === "blocks" ||
                    value === "experimental" ||
                    value === "legacy"
                  ) {
                    changeDataset(value)
                  }
                }}>
                <SelectTrigger id="property-dataset" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["blocks", "experimental", "legacy"] as const).map((id) => (
                    <SelectItem key={id} value={id}>
                      {t(`dataset_${id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <TabsContent value={kind} className="mt-6 space-y-6">
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
            <p
              id="property-search-help"
              className="text-muted-foreground text-sm">
              {t("searchHelp")}
            </p>
            {!state.q && !state.filters.length && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  {t("try")}
                </span>
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
                      filters: state.filters.filter(
                        (item) => item.id !== filter.id
                      ),
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <output
              aria-live="polite"
              aria-atomic="true"
              className="text-muted-foreground text-sm">
              {pending || !results
                ? t("loading")
                : t("resultCount", {
                    count: results.total,
                    total: catalog?.count ?? 0,
                  })}
            </output>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={selected.length < 2}
                onClick={() => setComparisonOpen(true)}>
                <GitCompareArrows aria-hidden="true" />
                {t("compare")}
                <Badge variant="secondary">{selected.length}</Badge>
              </Button>
              {(state.q || state.filters.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  onClick={clearFilters}>
                  {t("clearFilters")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() =>
                  void setState({
                    columns: [],
                    sort: "",
                    direction: "asc",
                    page: 1,
                  })
                }>
                <Columns3 aria-hidden="true" />
                {t("resetColumns")}
              </Button>
            </div>
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {selected.map((name) => (
                <Button
                  key={name}
                  variant="secondary"
                  size="sm"
                  className="min-h-11"
                  onClick={() => toggleCompare(name)}
                  aria-label={t("removeComparison", { name })}>
                  {name}
                  <X aria-hidden="true" />
                </Button>
              ))}
              <span className="text-muted-foreground text-sm">
                {t("compareHelp")}
              </span>
            </div>
          )}
          {catalogError || error ? (
            <Card role="alert" className="space-y-3">
              <p>{t("loadError")}</p>
              <Button
                variant="outline"
                onClick={() => {
                  void mutate()
                  void reloadCatalog()
                }}>
                {t("retry")}
              </Button>
            </Card>
          ) : !results || !catalog ? (
            <Skeleton className="h-80 w-full" />
          ) : results.total === 0 ? (
            <Card className="space-y-3 text-center">
              <h2 className="text-base font-semibold">{t("noResults")}</h2>
              <p className="text-muted-foreground">{t("noResultsHelp")}</p>
              <Button variant="outline" onClick={clearFilters}>
                {t("clearFilters")}
              </Button>
            </Card>
          ) : (
            <div aria-busy={pending} className="border-border border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="bg-card sticky left-0 z-10 min-w-52"
                      aria-sort={
                        state.sort === ""
                          ? state.direction === "desc"
                            ? "descending"
                            : "ascending"
                          : undefined
                      }>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11"
                        onClick={() => sortBy("")}>
                        {t("name")}
                        {state.sort === "" ? (
                          state.direction === "desc" ? (
                            <ArrowDown aria-hidden="true" />
                          ) : (
                            <ArrowUp aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown aria-hidden="true" />
                        )}
                      </Button>
                    </TableHead>
                    {results.columns.map((id) => (
                      <TableHead
                        key={id}
                        aria-sort={
                          state.sort === id
                            ? state.direction === "desc"
                              ? "descending"
                              : "ascending"
                            : undefined
                        }
                        className="min-w-40 whitespace-normal">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto min-h-11 justify-start whitespace-normal"
                          onClick={() => sortBy(id)}
                          title={byId.get(id)?.description}>
                          <span>
                            {byId.get(id)?.name}
                            {byId.get(id)?.unit && (
                              <span className="text-muted-foreground block text-xs">
                                {t("unit", { unit: byId.get(id)?.unit ?? "" })}
                              </span>
                            )}
                          </span>
                          {state.sort === id ? (
                            state.direction === "desc" ? (
                              <ArrowDown aria-hidden="true" />
                            ) : (
                              <ArrowUp aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown aria-hidden="true" />
                          )}
                        </Button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.entries.map((entry) => (
                    <TableRow
                      key={entry.name}
                      data-state={
                        selected.includes(entry.name) ? "selected" : undefined
                      }>
                      <TableCell className="bg-card sticky left-0 z-10 align-top">
                        <div className="flex items-center gap-2">
                          <Label className="flex size-11 shrink-0 items-center justify-center">
                            <Checkbox
                              checked={selected.includes(entry.name)}
                              disabled={
                                !selected.includes(entry.name) &&
                                selected.length >= 4
                              }
                              onCheckedChange={() => toggleCompare(entry.name)}
                              aria-label={t("selectComparison", {
                                name: entry.name,
                              })}
                            />
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto min-h-11 max-w-56 justify-start px-1 text-left whitespace-normal"
                            onClick={() =>
                              void setState({ entry: entry.name })
                            }>
                            {entry.name}
                          </Button>
                        </div>
                      </TableCell>
                      {results.columns.map((id) => (
                        <TableCell
                          key={id}
                          className="max-w-72 py-4 align-top whitespace-normal">
                          <div className="max-h-32 overflow-y-auto">
                            <PropertyValueView
                              value={entry.values[id] ?? null}
                            />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {results && results.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">{t("sortHelp")}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("previousPage")}
                  disabled={pending || results.page <= 1}
                  onClick={() => void setState({ page: results.page - 1 })}>
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <span className="text-sm tabular-nums">
                  {t("pageCount", { page: results.page, pages: results.pages })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("nextPage")}
                  disabled={pending || results.page >= results.pages}
                  onClick={() => void setState({ page: results.page + 1 })}>
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {t.rich("source", {
          source: SourceLink,
        })}
      </p>
      {state.entry && (
        <PropertyDetails
          key={`${state.dataset}-${state.entry}`}
          dataset={state.dataset}
          name={state.entry}
          properties={properties}
          onClose={() => void setState({ entry: null })}
        />
      )}
      {comparisonOpen && (
        <PropertyComparison
          dataset={state.dataset}
          names={selected}
          properties={properties}
          onClose={() => setComparisonOpen(false)}
        />
      )}
    </div>
  )
}
