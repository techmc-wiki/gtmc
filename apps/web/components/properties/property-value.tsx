import type { PropertyValue } from "@/lib/properties/types"

function renderValue(value: PropertyValue, dense: boolean) {
  if (value === null) return null
  if (Array.isArray(value)) {
    const unique = new Map(value.map((item) => [JSON.stringify(item), item]))
    const items = [...unique.values()]
    // Lists of tags or variants read as one dense line; nested records keep
    // their own block so state labels stay attached to their values.
    if (items.every((item) => item === null || typeof item !== "object")) {
      return (
        <span className="whitespace-pre-line">
          {items.map((item) => String(item)).join(", ")}
        </span>
      )
    }
    return (
      <div className={dense ? "space-y-0.5" : "space-y-1"}>
        {items.map((item) => (
          <PropertyValueView
            key={JSON.stringify(item)}
            value={item}
            dense={dense}
          />
        ))}
      </div>
    )
  }
  if (typeof value === "object") {
    return (
      <dl className={dense ? "space-y-0.5" : "space-y-1"}>
        {Object.entries(value).map(([state, item]) => (
          <div
            key={state}
            className="border-border flex flex-wrap gap-x-1.5 border-l-2 pl-1.5">
            <dt className="text-muted-foreground shrink-0 text-xs whitespace-pre-line">
              {state}
            </dt>
            <dd>
              <PropertyValueView value={item} dense={dense} />
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

export function PropertyValueView({
  value,
  dense = false,
}: {
  value: PropertyValue
  /** Table cells trade type size for row height; detail panes keep body text. */
  dense?: boolean
}) {
  const content = renderValue(value, dense)
  if (!dense || content === null) return content
  return <div className="text-xs leading-snug">{content}</div>
}
