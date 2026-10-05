"use client"

import { useTranslations } from "next-intl"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import { Checkbox } from "@/components/ui/shadcn/checkbox"
import { Label } from "@/components/ui/shadcn/label"
import { Card } from "@/components/ui/shadcn/card"
import { Skeleton } from "@/components/ui/shadcn/skeleton"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/shadcn/table"
import type { PropertyInfo, PropertyResults } from "@/lib/properties/types"
import { PropertyValueView } from "./property-value"

interface PropertyResultsTableProps {
  results?: PropertyResults
  catalogReady: boolean
  error: unknown
  onRetry: () => void
  onClearFilters: () => void
  pending: boolean
  state: { sort: string; direction: "asc" | "desc" }
  byId: Map<string, PropertyInfo>
  selected: string[]
  sortBy: (id: string) => void
  toggleCompare: (name: string) => void
  onOpenDetail: (name: string) => void
}

export function PropertyResultsTable({
  results,
  catalogReady,
  error,
  onRetry,
  onClearFilters,
  pending,
  state,
  byId,
  selected,
  sortBy,
  toggleCompare,
  onOpenDetail,
}: PropertyResultsTableProps) {
  const t = useTranslations("Properties")
  if (error) {
    return (
      <Card role="alert" className="space-y-3">
        <p>{t("loadError")}</p>
        <Button variant="outline" onClick={onRetry}>
          {t("retry")}
        </Button>
      </Card>
    )
  }
  if (!results || !catalogReady) return <Skeleton className="h-80 w-full" />
  if (results.total === 0) {
    return (
      <Card className="space-y-3 text-center">
        <h2 className="text-base font-semibold">{t("noResults")}</h2>
        <p className="text-muted-foreground">{t("noResultsHelp")}</p>
        <Button variant="outline" onClick={onClearFilters}>
          {t("clearFilters")}
        </Button>
      </Card>
    )
  }
  const selectedNames = new Set(selected)
  return (
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
                selectedNames.has(entry.name) ? "selected" : undefined
              }>
              <TableCell className="bg-card sticky left-0 z-10 align-top">
                <div className="flex items-center gap-2">
                  <Label className="flex size-11 shrink-0 items-center justify-center">
                    <Checkbox
                      checked={selectedNames.has(entry.name)}
                      disabled={
                        !selectedNames.has(entry.name) && selected.length >= 4
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
                    onClick={() => onOpenDetail(entry.name)}>
                    {entry.name}
                  </Button>
                </div>
              </TableCell>
              {results.columns.map((id) => (
                <TableCell
                  key={id}
                  className="max-w-72 py-4 align-top whitespace-normal">
                  <div className="max-h-32 overflow-y-auto">
                    <PropertyValueView value={entry.values[id] ?? null} />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
