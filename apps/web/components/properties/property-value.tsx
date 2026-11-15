"use client"

import { useTranslations } from "next-intl"

import { booleanBranches, summarizeEntries, summarizeLabels } from "@/lib/properties/summarize"
import type { PropertyValue } from "@/lib/properties/types"

type Entry = { labels: string[]; value: PropertyValue }

function StateLabels({ labels }: { labels: string[] }) {
  const t = useTranslations("Properties")
  const pattern = summarizeLabels(labels)
  if (labels.length <= 4 && labels.join(", ").length <= 120) {
    return <span className="whitespace-pre-line">{labels.join(", ")}</span>
  }
  return (
    <details>
      <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
        {pattern && (
          <span>
            {pattern.prefix}…{pattern.suffix}{" "}
          </span>
        )}
        {t("labelCount", { count: labels.length })}
      </summary>
      <span className="block whitespace-pre-line">{labels.join("\n")}</span>
    </details>
  )
}

function StateEntries({ entries, dense }: { entries: Entry[]; dense: boolean }) {
  return (
    <dl className={dense ? "space-y-0.5" : "space-y-1"}>
      {entries.map((entry) => (
        <div
          key={entry.labels.join("\n")}
          className="border-border flex flex-wrap gap-x-1.5 border-l-2 pl-1.5">
          <dt className="text-muted-foreground min-w-0 text-xs">
            <StateLabels labels={entry.labels} />
          </dt>
          <dd className="min-w-0">
            <ValueContent value={entry.value} dense={dense} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Renders an array value. Items carry no id, so each one is keyed by its
 * content signature; the occurrence counter keeps repeated values distinct
 * while a reorder keeps every item's identity.
 */
function ValueList({ items, dense }: { items: PropertyValue[]; dense: boolean }) {
  const seen = new Map<string, number>()
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const signature = JSON.stringify(item)
        const occurrence = (seen.get(signature) ?? 0) + 1
        seen.set(signature, occurrence)
        return (
          <div key={`${occurrence}:${signature}`}>
            {item === null ? "null" : <ValueContent value={item} dense={dense} />}
          </div>
        )
      })}
    </div>
  )
}

function ValueContent({ value, dense }: { value: PropertyValue; dense: boolean }) {
  const t = useTranslations("Properties")
  if (value === null) return null
  if (Array.isArray(value)) {
    if (value.length > 4) {
      return (
        <details>
          <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
            {t("valueCount", { count: value.length })}
          </summary>
          <ValueList items={value} dense={dense} />
        </details>
      )
    }
    if (value.every((item) => item === null || typeof item !== "object")) {
      return <span className="whitespace-pre-line">{value.map(String).join(", ")}</span>
    }
    return <ValueList items={value} dense={dense} />
  }
  if (typeof value === "object") {
    const boolean = booleanBranches(value)
    if (boolean) {
      return (
        <div className="border-border space-y-0.5 border-l-2 pl-1.5">
          <div className="text-muted-foreground">{boolean.name}?</div>
          <div>
            {t("yes")} → <ValueContent value={boolean.yes} dense={dense} />
          </div>
          <div>
            {t("no")} → <ValueContent value={boolean.no} dense={dense} />
          </div>
        </div>
      )
    }
    const entries = summarizeEntries(value)
    if (entries.length > 4) {
      return (
        <div className="space-y-1">
          <StateEntries entries={entries.slice(0, 3)} dense={dense} />
          <details>
            <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
              {t("moreStates", { count: entries.length - 3 })}
            </summary>
            <StateEntries entries={entries.slice(3)} dense={dense} />
          </details>
        </div>
      )
    }
    return <StateEntries entries={entries} dense={dense} />
  }
  if (typeof value === "string" && value.length > 220) {
    return (
      <details>
        <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
          {value.slice(0, 120)}…
        </summary>
        <span className="whitespace-pre-line">{value}</span>
      </details>
    )
  }
  return <span className="whitespace-pre-line tabular-nums">{String(value)}</span>
}

export function PropertyValueView({
  value,
  dense = false,
}: {
  value: PropertyValue
  dense?: boolean
}) {
  return (
    <div className={dense ? "text-xs leading-snug" : undefined}>
      <ValueContent value={value} dense={dense} />
    </div>
  )
}
