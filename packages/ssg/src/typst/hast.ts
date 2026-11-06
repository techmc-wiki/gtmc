import type { Element, Root, RootContent } from "hast"

/** Looks a property up by any spelling: `data-foo-bar`, `dataFooBar` and `datafoobar` are one name. */
export function attr(el: Element, name: string): string | undefined {
  const wanted = name.replaceAll("-", "").toLowerCase()
  for (const [key, value] of Object.entries(el.properties)) {
    if (key.replaceAll("-", "").toLowerCase() !== wanted) continue
    if (typeof value === "string") return value
    if (typeof value === "number") return String(value)
    if (value === true) return "true"
    if (Array.isArray(value)) return value.map(String).join(" ")
  }
  return undefined
}

/** Raw HTML `class` and hast `className` both count. */
export function classList(el: Element): string[] {
  return [attr(el, "className"), attr(el, "class")]
    .flatMap((value) => (value === undefined ? [] : value.split(/\s+/)))
    .filter((name) => name !== "")
}

export function elementsOf(nodes: readonly RootContent[]): Element[] {
  return nodes.filter((node): node is Element => node.type === "element")
}

export function textOf(node: Root | RootContent): string {
  if (node.type === "text") return node.value
  if (node.type === "element" || node.type === "root")
    return node.children.map(textOf).join("")
  return ""
}

/** Whitespace text, comments and doctypes: no output, and they do not split a paragraph. */
export function isIgnorable(node: RootContent): boolean {
  if (node.type === "text") return node.value.trim() === ""
  return node.type === "comment" || node.type === "doctype"
}

export function walkElements(
  node: Root | RootContent,
  visit: (el: Element) => void
): void {
  if (node.type === "element") visit(node)
  if (node.type === "element" || node.type === "root") {
    for (const child of node.children) walkElements(child, visit)
  }
}
