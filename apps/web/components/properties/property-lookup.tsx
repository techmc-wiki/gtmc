"use client"

import { useEffect, useState, type ReactNode } from "react"
import useSWRImmutable from "swr/immutable"
import { useTranslations, useLocale } from "next-intl"
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
  GitCompareArrows,
  RotateCcw,
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
  type PropertyCondition,
  type PropertyFilter,
  type PropertyResults,
} from "@/lib/properties/types"
import { PropertyControls } from "./property-controls"
import { PropertyResultsTable } from "./property-results-table"
import { PropertyDetails, PropertyComparison } from "./property-details"
import { propertyFetcher } from "@/lib/properties/fetcher"

/**
 * Query shape of the filter list. Row ids are client-only, conditions without
 * a value or presence match everything, and ANDed conditions are order- and
 * repetition-insensitive, so those differences must not change the lookup key.
 * Otherwise editing a row refetches a response equivalent to one already
 * cached.
 */
function canonicalFilters(filters: PropertyFilter[]): PropertyCondition[] {
  const unique = new Map<string, PropertyCondition>()
  for (const filter of filters) {
    if (!filter.property || !filter.operator || !filter.value.trim()) continue
    const condition: PropertyCondition = {
      property: filter.property,
      operator: filter.operator,
      value: filter.value,
    }
    unique.set(JSON.stringify(condition), condition)
  }
  return [...unique.values()].toSorted((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right))
  )
}

const filtersParser = parseAsJson(
  z
    .array(
      z.object({
        id: z.string().max(50),
        property: z.string().max(150),
        operator: z.union([z.enum(FILTER_OPERATORS), z.literal("")]),
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
  const locale = useLocale()
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
  const catalogKey = `/api/properties?dataset=${state.dataset}&locale=${locale}&mode=catalog`
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
  const activeFilters = canonicalFilters(state.filters)
  const parameters = new URLSearchParams({
    dataset: state.dataset,
    locale,
    q: state.q.slice(0, 200),
    columns: columns.join(","),
    filters: JSON.stringify(activeFilters),
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
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("resetColumns")}
                title={t("resetColumns")}
                onClick={() =>
                  void setState({
                    columns: [],
                    sort: "",
                    direction: "asc",
                    page: 1,
                  })
                }>
                <RotateCcw aria-hidden="true" />
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
            <div className="flex flex-wrap items-center justify-end gap-3">
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
