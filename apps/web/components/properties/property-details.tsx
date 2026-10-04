"use client"

import { useState } from "react"
import useSWRImmutable from "swr/immutable"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/shadcn/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/shadcn/dialog"
import { Input } from "@/components/ui/shadcn/input"
import { Label } from "@/components/ui/shadcn/label"
import { Checkbox } from "@/components/ui/shadcn/checkbox"
import { Button } from "@/components/ui/shadcn/button"
import { Skeleton } from "@/components/ui/shadcn/skeleton"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/shadcn/table"
import type {
  DatasetId,
  PropertyEntry,
  PropertyInfo,
} from "@/lib/properties/types"
import { PropertyValueView } from "./property-value"

export async function propertyFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Property lookup failed")
  return response.json() as Promise<T>
}

function DetailContent({
  dataset,
  names,
  properties,
}: {
  dataset: DatasetId
  names: string[]
  properties: PropertyInfo[]
}) {
  const t = useTranslations("Properties")
  const [query, setQuery] = useState("")
  const [differencesOnly, setDifferencesOnly] = useState(names.length > 1)
  const key = `/api/properties?${new URLSearchParams({ dataset, mode: "details", names: JSON.stringify(names) })}`
  const { data, error, mutate } = useSWRImmutable<PropertyEntry[]>(
    key,
    propertyFetcher
  )
  const visible = properties.filter(
    (property) =>
      `${property.name} ${property.id} ${property.category} ${property.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!differencesOnly ||
        !data ||
        new Set(
          data.map((entry) => JSON.stringify(entry.values[property.id] ?? null))
        ).size > 1)
  )
  return (
    <>
      <div className="space-y-2 px-4 pb-4 sm:px-6">
        <Label htmlFor="detail-property-search">{t("findProperty")}</Label>
        <Input
          id="detail-property-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("propertyExample")}
        />
        {names.length > 1 && (
          <Label className="flex min-h-11 items-center gap-2">
            <Checkbox
              checked={differencesOnly}
              onCheckedChange={(checked) =>
                setDifferencesOnly(checked === true)
              }
            />
            {t("differencesOnly")}
          </Label>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-6 sm:px-6">
        {error ? (
          <div role="alert" className="space-y-3">
            <p>{t("loadError")}</p>
            <Button variant="outline" onClick={() => void mutate()}>
              {t("retry")}
            </Button>
          </div>
        ) : !data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-background sticky top-0 min-w-44">
                  {t("property")}
                </TableHead>
                {data.map((entry) => (
                  <TableHead
                    key={entry.name}
                    className="bg-background sticky top-0 min-w-48 whitespace-normal">
                    {entry.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="max-w-80 py-4 align-top whitespace-normal">
                    <p className="font-medium">{property.name}</p>
                    {property.unit && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("unit", { unit: property.unit })}
                      </p>
                    )}
                    {property.description && (
                      <p className="text-muted-foreground mt-2 text-sm leading-relaxed whitespace-pre-line">
                        {property.description}
                      </p>
                    )}
                  </TableCell>
                  {data.map((entry) => (
                    <TableCell
                      key={entry.name}
                      className="max-w-96 py-4 align-top whitespace-normal">
                      <PropertyValueView
                        value={entry.values[property.id] ?? null}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && !visible.length && (
          <p className="py-6 text-center">{t("noProperty")}</p>
        )}
      </div>
    </>
  )
}

export function PropertyDetails({
  dataset,
  name,
  properties,
  onClose,
}: {
  dataset: DatasetId
  name: string
  properties: PropertyInfo[]
  onClose: () => void
}) {
  const t = useTranslations("Properties")
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}>
      <SheetContent className="w-full sm:max-w-3xl">
        <SheetHeader className="p-4 pr-16 sm:p-6">
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>{t("detailDescription")}</SheetDescription>
        </SheetHeader>
        <DetailContent
          dataset={dataset}
          names={[name]}
          properties={properties}
        />
      </SheetContent>
    </Sheet>
  )
}

export function PropertyComparison({
  dataset,
  names,
  properties,
  onClose,
}: {
  dataset: DatasetId
  names: string[]
  properties: PropertyInfo[]
  onClose: () => void
}) {
  const t = useTranslations("Properties")
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}>
      <DialogContent className="bg-background top-1/2 left-1/2 h-[85dvh] w-[calc(100vw-2rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 p-0">
        <DialogHeader className="p-4 pr-16 sm:p-6">
          <DialogTitle>{t("comparisonTitle")}</DialogTitle>
          <DialogDescription>{t("comparisonDescription")}</DialogDescription>
        </DialogHeader>
        <DetailContent
          dataset={dataset}
          names={names}
          properties={properties}
        />
      </DialogContent>
    </Dialog>
  )
}
