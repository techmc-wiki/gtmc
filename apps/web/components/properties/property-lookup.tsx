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
  ChevronLeft,
  ChevronRight,
  Columns3,
  GitCompareArrows,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
import { Label } from "@/components/ui/shadcn/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/shadcn/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/shadcn/tabs"
import {
  DATASETS,
  FILTER_OPERATORS,
  type DatasetId,
  type FilterOperator,
  type PropertyCatalog,
  type PropertyResults,
} from "@/lib/properties/types"
import { PropertyControls } from "./property-controls"
import { PropertyResultsTable } from "./property-results-table"
import { PropertyDetails, PropertyComparison } from "./property-details"
import { propertyFetcher } from "@/lib/properties/fetcher"

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

function usePropertyLookup(initialCatalog: PropertyCatalog) {
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
  const kind: "blocks" | "entities" | "items" =
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
  return {
    state,
    setState,
    comparisonOpen,
    setComparisonOpen,
    catalog,
    catalogError,
    reloadCatalog,
    columns,
    selected,
    results,
    error,
    mutate,
    pending,
    properties,
    byId,
    kind,
    changeDataset,
    toggleColumn,
    addFilter,
    sortBy,
    toggleCompare,
    clearFilters,
  }
}

export function PropertyLookup({
  initialCatalog,
}: {
  initialCatalog: PropertyCatalog
}) {
  const t = useTranslations("Properties")
  const {
    state,
    setState,
    comparisonOpen,
    setComparisonOpen,
    catalog,
    catalogError,
    reloadCatalog,
    columns,
    selected,
    results,
    error,
    mutate,
    pending,
    properties,
    byId,
    kind,
    changeDataset,
    toggleColumn,
    addFilter,
    sortBy,
    toggleCompare,
    clearFilters,
  } = usePropertyLookup(initialCatalog)

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
          <PropertyControls
            kind={kind}
            state={state}
            setState={setState}
            columns={columns}
            properties={properties}
            byId={byId}
            toggleColumn={toggleColumn}
            addFilter={addFilter}
          />
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
          <PropertyResultsTable
            results={results}
            catalogReady={Boolean(catalog)}
            error={catalogError || error}
            onRetry={() => {
              void mutate()
              void reloadCatalog()
            }}
            onClearFilters={clearFilters}
            pending={pending}
            state={state}
            byId={byId}
            selected={selected}
            sortBy={sortBy}
            toggleCompare={toggleCompare}
            onOpenDetail={(name) => void setState({ entry: name })}
          />
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
