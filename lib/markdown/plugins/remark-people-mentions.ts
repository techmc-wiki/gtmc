import type { Content, Html, Parent, Root } from "mdast"
import { visit } from "unist-util-visit"

/**
 * Minimal VFile shape needed by this plugin.
 * The full type comes from the `vfile` package (transitive dependency of unified).
 */
interface RawFile {
  value: string | Uint8Array
}

/**
 * Regex matching `[@name]` where name is one or more non-bracket characters.
 * The negative character class `[^\[\]]+` allows CJK, spaces, underscores,
 * hyphens, periods, and mixed case — any character that isn't `[` or `]`.
 */
const MENTION_PATTERN = /\[@([^\[\]]+)\]/g

/**
 * Parent node types whose text children MUST NOT be transformed.
 * Mentions inside links, images, definitions, or their references
 * would create invalid or nested interactive elements.
 */
const SKIP_PARENT_TYPES = new Set([
  "link",
  "linkReference",
  "image",
  "imageReference",
  "definition",
])

function isParentNode(node: unknown): node is Parent {
  return Array.isArray((node as Parent | undefined)?.children)
}

/**
 * Minimal HTML-attribute and text-content escaping.
 * For attribute values: escape &, ", <, >
 * For text content: escape &, <, >
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Scan a single text node for `[@key]` patterns and produce a
 * replacement array of text + html content nodes.
 *
 * The `rawSource` and `textStartOffset` parameters allow checking whether the
 * match was backslash-escaped at the markdown level (i.e. `\[@name]` written
 * in the original source), which the parse step has already consumed.
 *
 * Returns null when no mention is found (optimisation: the caller
 * can keep the original child reference instead of spreading).
 */
function replacePeopleMentions(
  value: string,
  rawSource: string,
  textStartOffset: number
): Content[] | null {
  MENTION_PATTERN.lastIndex = 0

  const nextChildren: Content[] = []
  let lastIndex = 0
  let hasMatch = false

  for (const match of value.matchAll(MENTION_PATTERN)) {
    const fullMatch = match[0]
    const personKey = match[1]
    const matchIndex = match.index ?? 0

    if (matchIndex > lastIndex) {
      nextChildren.push({
        type: "text",
        value: value.slice(lastIndex, matchIndex),
      })
    }

    // --- Backslash-escape detection ---
    // Strategy: search for the match text (`[@key]`) inside the raw source
    // anchored to the text node's range in the original file.  This catches
    // markdown-level escapes such as `\[@name]` that remark-parse has
    // already consumed (so the escaped backslash no longer appears in the
    // text-node value).
    const searchStart = textStartOffset + matchIndex
    const rawPos = rawSource.indexOf(fullMatch, searchStart)

    // rawPos could be -1 when the markdown source doesn't contain the exact
    // match string (e.g. both brackets escaped with `\]`).  In that case
    // we conservatively treat it as escaped.
    const wasMarkdownEscaped =
      rawPos === -1 || isBackslashEscapedAt(rawSource, rawPos)

    if (wasMarkdownEscaped) {
      // Backslash-escaped in original markdown → leave as literal text
      nextChildren.push({ type: "text", value: fullMatch })
    } else {
      const encodedKey = escapeHtml(personKey)
      nextChildren.push({
        type: "html",
        value: `<people-mention data-person-key="${encodedKey}">${escapeHtml(personKey)}</people-mention>`,
      } as Html)
      hasMatch = true
    }

    lastIndex = matchIndex + fullMatch.length
  }

  if (!hasMatch) return null

  if (lastIndex < value.length) {
    nextChildren.push({ type: "text", value: value.slice(lastIndex) })
  }

  return nextChildren
}

/**
 * Walk backwards from `pos` in `source` counting consecutive backslashes.
 * Return `true` when the count is odd (meaning the character at `pos` was
 * markdown-escaped).
 */
function isBackslashEscapedAt(source: string, pos: number): boolean {
  let count = 0
  let i = pos - 1
  while (i >= 0 && source[i] === "\\") {
    count++
    i--
  }
  return count % 2 !== 0
}

/**
 * Remark plugin — transforms `[@PersonKey]` syntax into `<people-mention>` tags.
 *
 * The rehype pipeline (specifically `rehype-raw`) will process the emitted
 * HTML elements, making them available to downstream React components via
 * `rehype-react` / `customComponents`.
 *
 * @example
 *   `[@BFladderbean]` → `<people-mention data-person-key="BFladderbean">BFladderbean</people-mention>`
 */
export function remarkPeopleMentions() {
  return (tree: Root, file: RawFile) => {
    const rawSource = String(file.value)

    visit(tree, (node) => {
      if (!isParentNode(node)) return

      if (SKIP_PARENT_TYPES.has(node.type)) return

      const nextChildren: Content[] = []
      let didChange = false

      for (const child of node.children) {
        if (child.type !== "text") {
          nextChildren.push(child)
          continue
        }

        const textStartOffset = child.position?.start?.offset ?? 0
        const replacement = replacePeopleMentions(
          child.value,
          rawSource,
          textStartOffset
        )
        if (replacement === null) {
          nextChildren.push(child)
          continue
        }

        nextChildren.push(...replacement)
        didChange = true
      }

      if (didChange) {
        node.children = nextChildren
      }
    })
  }
}
