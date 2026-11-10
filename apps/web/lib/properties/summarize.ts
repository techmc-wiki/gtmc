import type { PropertyValue } from "./types"

/** Upstream state maps use `<br>`-derived newlines to pack several labels. */
const LABEL_SEPARATOR = /\r\n|\n|\r/
const WORD = /[\p{L}\p{N}]/u
const MIN_PATTERN_LABELS = 4

export interface SummaryEntry {
  /** Every original label, in source order; duplicates are kept. */
  labels: string[]
  value: PropertyValue
}

export interface LabelSummary {
  /** Text before the varying part, including its trailing separator. */
  prefix: string
  /** Text after the varying part, including its leading separator. */
  suffix: string
  /** Number of distinct labels the pattern was derived from. */
  count: number
}

function isWord(character: string | undefined): boolean {
  return character !== undefined && WORD.test(character)
}

function isBoundary(character: string | undefined): boolean {
  return character !== undefined && !WORD.test(character)
}

function labelsFrom(key: string): string[] {
  return key
    .split(LABEL_SEPARATOR)
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
}

/**
 * Structural equality for the JSON-shaped property values. Scalars compare
 * with `Object.is`, arrays element-wise in order, and records by own keys so
 * key order in nested state maps never changes the grouping.
 */
function deepEqual(left: PropertyValue, right: PropertyValue): boolean {
  if (left === right) return true
  if (left === null || right === null) return false
  if (typeof left !== "object" || typeof right !== "object") {
    return Object.is(left, right)
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => deepEqual(item, right[index]))
    )
  }
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]))
}

/**
 * Groups state-map entries by equal value. Newline-separated labels are
 * split, trimmed, and collected without deduplication; entries with unequal
 * values stay in separate groups even when they share labels. Groups appear
 * in first-seen order.
 */
export function summarizeEntries(
  value: Record<string, PropertyValue>,
): Array<{ labels: string[]; value: PropertyValue }> {
  const groups: SummaryEntry[] = []
  for (const [key, entry] of Object.entries(value)) {
    const labels = labelsFrom(key)
    const existing = groups.find((group) => deepEqual(group.value, entry))
    if (existing) existing.labels.push(...labels)
    else groups.push({ labels, value: entry })
  }
  return groups
}

/** Last word character of a prefix, as an exclusive end index. */
function wordEnd(value: string): number {
  for (let index = value.length - 1; index >= 0; index--) {
    if (isWord(value[index])) return index + 1
  }
  return 0
}

function endsAtWordBoundary(label: string, end: number): boolean {
  if (end === label.length) return true
  return isBoundary(label[end - 1]) || isBoundary(label[end])
}

function startsAtWordBoundary(label: string, suffix: string): boolean {
  const start = label.length - suffix.length
  if (start === 0) return true
  return isBoundary(suffix[0]) || isBoundary(label[start - 1])
}

/** Longest common prefix that ends on a whole word, or "". */
function commonPrefix(labels: string[]): string {
  const first = labels[0]
  if (first === undefined) return ""
  let length = first.length
  for (const label of labels) {
    let index = 0
    while (index < length && index < label.length && label[index] === first[index]) {
      index++
    }
    length = index
    if (length === 0) break
  }
  for (let end = length; end > 0; end--) {
    const candidate = first.slice(0, end)
    if (!WORD.test(candidate)) continue
    if (labels.every((label) => endsAtWordBoundary(label, end))) {
      return candidate
    }
  }
  return ""
}

/** Longest common suffix that starts on a whole word, or "". */
function commonSuffix(labels: string[]): string {
  const first = labels[0]
  if (first === undefined) return ""
  let length = first.length
  for (const label of labels) {
    let index = 0
    while (
      index < length &&
      index < label.length &&
      label[label.length - 1 - index] === first[first.length - 1 - index]
    ) {
      index++
    }
    length = index
    if (length === 0) break
  }
  for (let start = first.length - length; start < first.length; start++) {
    const candidate = first.slice(start)
    if (!WORD.test(candidate)) continue
    if (labels.every((label) => startsAtWordBoundary(label, candidate))) {
      return candidate
    }
  }
  return ""
}

/**
 * Reports a shared textual frame for at least four distinct labels. This is a
 * display hint only: it never stands in for the labels themselves, and any
 * partial word, one-sided frame, or overlapping word parts fall back to null.
 */
export function summarizeLabels(
  labels: string[],
): { prefix: string; suffix: string; count: number } | null {
  const distinct = [
    ...new Set(labels.map((label) => label.trim()).filter((label) => label.length > 0)),
  ]
  if (distinct.length < MIN_PATTERN_LABELS) return null
  const prefix = commonPrefix(distinct)
  const suffix = commonSuffix(distinct)
  if (!prefix || !suffix) return null
  const prefixEnd = wordEnd(prefix)
  const suffixWordStart = suffix.search(WORD)
  if (prefixEnd === 0 || suffixWordStart === -1) return null
  for (const label of distinct) {
    const suffixWordBegin = label.length - suffix.length + suffixWordStart
    if (suffixWordBegin < prefixEnd) return null
  }
  return { prefix, suffix, count: distinct.length }
}

const BOOLEAN_BRANCH = /^\s*([^:\r\n]+?)\s*:\s*(true|false)\s*$/i

function parseBooleanBranch(key: string): { name: string; yes: boolean } | null {
  if (/[\r\n]/.test(key)) return null
  const match = BOOLEAN_BRANCH.exec(key)
  if (!match) return null
  const name = match[1].trim()
  if (name.length === 0) return null
  return { name, yes: match[2].toLowerCase() === "true" }
}

/**
 * Detects a two-key map that holds one state's true and false branch, such as
 * `{ "waterlogged: false": 0.7, "waterlogged: true": 100 }`. Both keys must
 * name the same state unambiguously; the values are returned untouched.
 */
export function booleanBranches(
  value: Record<string, PropertyValue>,
): { name: string; yes: PropertyValue; no: PropertyValue } | null {
  const keys = Object.keys(value)
  if (keys.length !== 2) return null
  const left = parseBooleanBranch(keys[0])
  const right = parseBooleanBranch(keys[1])
  if (!left || !right || left.name !== right.name) return null
  if (left.yes === right.yes) return null
  const yesKey = left.yes ? keys[0] : keys[1]
  const noKey = left.yes ? keys[1] : keys[0]
  return { name: left.name, yes: value[yesKey], no: value[noKey] }
}
