import type { PropertyValue } from "@/lib/properties/types"

export function PropertyValueView({ value }: { value: PropertyValue }) {
  if (value === null) return null
  if (Array.isArray(value)) {
    const unique = new Map(value.map((item) => [JSON.stringify(item), item]))
    return (
      <div className="space-y-2">
        {[...unique].map(([key, item]) => (
          <PropertyValueView key={key} value={item} />
        ))}
      </div>
    )
  }
  if (typeof value === "object") {
    return (
      <dl className="space-y-2">
        {Object.entries(value).map(([state, item]) => (
          <div key={state} className="border-border border-l-2 pl-2">
            <dt className="text-muted-foreground text-xs whitespace-pre-line">
              {state}
            </dt>
            <dd className="mt-0.5">
              <PropertyValueView value={item} />
            </dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <span className="whitespace-pre-line tabular-nums">{String(value)}</span>
  )
}
