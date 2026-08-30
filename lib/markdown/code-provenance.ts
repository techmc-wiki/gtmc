export const DEFAULT_MINECRAFT_VERSION = "1.20.1"
export const DEFAULT_MAPPING_NAME = "yarn"
export const JAVA_CODE_PROVENANCE_META_PROPERTY = "dataJavaProvenanceMeta"

const PROVENANCE_KEYS = new Set([
  "mc",
  "mapping",
  "decompiler",
  "file",
  "lines",
])
const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/
const TOOL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const TOOL_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+:-]*$/

export interface CodeToolReference {
  name: string
  version?: string
}

export interface CodeLineRange {
  start: number
  end?: number
}

export interface ResolvedJavaCodeProvenance {
  minecraftVersion: string
  mapping: CodeToolReference
  decompiler?: CodeToolReference
  file?: string
  lines?: CodeLineRange
}

export interface CodeReference extends ResolvedJavaCodeProvenance {
  id: string
  blockIndex: number
  language: "java"
  codeHash: string
  markdownLine: number
}

export type CodeProvenanceErrorCode =
  | "expected-field"
  | "unknown-field"
  | "duplicate-field"
  | "empty-value"
  | "invalid-minecraft-version"
  | "invalid-tool"
  | "invalid-file"
  | "invalid-lines"

export class CodeProvenanceSyntaxError extends Error {
  readonly code: CodeProvenanceErrorCode
  readonly field?: string

  constructor(code: CodeProvenanceErrorCode, message: string, field?: string) {
    super(message)
    this.name = "CodeProvenanceSyntaxError"
    this.code = code
    this.field = field
  }
}

function parseToolReference(
  value: string,
  field: "mapping" | "decompiler"
): CodeToolReference {
  const parts = value.split("@")
  const name = parts[0]
  const version = parts[1]

  if (
    parts.length > 2 ||
    !name ||
    !TOOL_NAME_RE.test(name) ||
    (version !== undefined && (!version || !TOOL_VERSION_RE.test(version)))
  ) {
    throw new CodeProvenanceSyntaxError(
      "invalid-tool",
      `${field} must use name or name@version`,
      field
    )
  }

  return {
    name: name.toLowerCase(),
    ...(version ? { version } : {}),
  }
}

function parseLineRange(value: string): CodeLineRange {
  const match = /^(\d+)(?:-(\d+))?$/.exec(value)
  if (!match) {
    throw new CodeProvenanceSyntaxError(
      "invalid-lines",
      "lines must be a positive line number or start-end range",
      "lines"
    )
  }

  const start = Number.parseInt(match[1], 10)
  const end = match[2] ? Number.parseInt(match[2], 10) : undefined
  if (start < 1 || (end !== undefined && end < start)) {
    throw new CodeProvenanceSyntaxError(
      "invalid-lines",
      "lines must be a positive ascending range",
      "lines"
    )
  }

  return { start, ...(end !== undefined ? { end } : {}) }
}

export function parseJavaCodeProvenance(
  meta: string | null | undefined
): ResolvedJavaCodeProvenance {
  const values = new Map<string, string>()
  const trimmedMeta = meta?.trim() ?? ""

  if (trimmedMeta) {
    for (const token of trimmedMeta.split(/\s+/)) {
      const separatorIndex = token.indexOf("=")
      if (separatorIndex <= 0) {
        throw new CodeProvenanceSyntaxError(
          "expected-field",
          `expected key=value metadata, received "${token}"`
        )
      }

      const key = token.slice(0, separatorIndex)
      const value = token.slice(separatorIndex + 1)
      if (!PROVENANCE_KEYS.has(key)) {
        throw new CodeProvenanceSyntaxError(
          "unknown-field",
          `unknown Java provenance field "${key}"`,
          key
        )
      }
      if (values.has(key)) {
        throw new CodeProvenanceSyntaxError(
          "duplicate-field",
          `duplicate Java provenance field "${key}"`,
          key
        )
      }
      if (!value) {
        throw new CodeProvenanceSyntaxError(
          "empty-value",
          `Java provenance field "${key}" cannot be empty`,
          key
        )
      }
      values.set(key, value)
    }
  }

  const minecraftVersion = values.get("mc") ?? DEFAULT_MINECRAFT_VERSION
  if (!VERSION_RE.test(minecraftVersion)) {
    throw new CodeProvenanceSyntaxError(
      "invalid-minecraft-version",
      "mc must be a Minecraft version without whitespace",
      "mc"
    )
  }

  const mapping = parseToolReference(
    values.get("mapping") ?? DEFAULT_MAPPING_NAME,
    "mapping"
  )
  const decompilerValue = values.get("decompiler")
  const file = values.get("file")
  if (file && (file.includes("`") || /[\u0000-\u001f]/.test(file))) {
    throw new CodeProvenanceSyntaxError(
      "invalid-file",
      "file must be a printable path without backticks",
      "file"
    )
  }

  const linesValue = values.get("lines")
  return {
    minecraftVersion,
    mapping,
    ...(decompilerValue
      ? { decompiler: parseToolReference(decompilerValue, "decompiler") }
      : {}),
    ...(file ? { file } : {}),
    ...(linesValue ? { lines: parseLineRange(linesValue) } : {}),
  }
}

export function formatToolReference(tool: CodeToolReference): string {
  return tool.version
    ? `${tool.name.toUpperCase()}@${tool.version}`
    : tool.name.toUpperCase()
}

export function formatLineRange(lines: CodeLineRange): string {
  return lines.end === undefined
    ? String(lines.start)
    : `${lines.start}-${lines.end}`
}

export function formatCodeProvenanceLabel(
  provenance: ResolvedJavaCodeProvenance
): string {
  const parts = [
    "JAVA",
    `MC ${provenance.minecraftVersion}`,
    formatToolReference(provenance.mapping),
  ]
  if (provenance.decompiler) {
    parts.push(formatToolReference(provenance.decompiler))
  }
  if (provenance.file) {
    parts.push(
      provenance.lines
        ? `${provenance.file}:${formatLineRange(provenance.lines)}`
        : provenance.file
    )
  } else if (provenance.lines) {
    parts.push(`L${formatLineRange(provenance.lines)}`)
  }
  return parts.join(" · ")
}

export interface JavaFenceDiagnostic {
  code: CodeProvenanceErrorCode
  field?: string
  line: number
  from: number
  to: number
  message: string
}

export function getJavaFenceDiagnostics(
  markdown: string
): JavaFenceDiagnostic[] {
  const diagnostics: JavaFenceDiagnostic[] = []
  let offset = 0

  for (const [index, rawLine] of markdown.split("\n").entries()) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine
    const match = /^( {0,3})(?:`{3,}|~{3,})java(?:[ \t]+(.*?))?[ \t]*$/i.exec(
      line
    )
    if (match) {
      try {
        parseJavaCodeProvenance(match[2])
      } catch (error) {
        if (error instanceof CodeProvenanceSyntaxError) {
          diagnostics.push({
            code: error.code,
            field: error.field,
            line: index + 1,
            from: offset,
            to: offset + line.length,
            message: error.message,
          })
        } else {
          throw error
        }
      }
    }
    offset += rawLine.length + 1
  }

  return diagnostics
}
