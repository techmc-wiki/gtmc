import fs from "node:fs"
import path from "node:path"
import { workspacePath } from "@/lib/workspace-paths"

const GLOBALS_CSS = workspacePath("apps", "web", "app", "globals.css")

const ANSI_NAMES = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "bright-black",
  "bright-red",
  "bright-green",
  "bright-yellow",
  "bright-blue",
  "bright-magenta",
  "bright-cyan",
  "bright-white",
] as const

const COLOR_TOKENS = [
  { css: "--color-tech-bg", key: "bg" },
  { css: "--color-tech-main", key: "main" },
  { css: "--color-tech-main-dark", key: "main-dark" },
  { css: "--color-tech-accent", key: "accent" },
  { css: "--color-tech-line", key: "line" },
  { css: "--color-tech-advanced", key: "advanced" },
  { css: "--color-tech-signal", key: "signal" },
  { css: "--color-tech-signal-ink", key: "signal-ink" },
  { css: "--color-surface", key: "surface" },
] as const

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/** Declarations of the first `:root` block (the light theme), without comments. */
function lightRootDeclarations(css: string): Map<string, string> {
  const withoutComments = css.replaceAll(/\/\*[\s\S]*?\*\//g, "")
  const match = /(^|\n):root\s*\{/.exec(withoutComments)
  if (!match) throw new Error(`No :root block in ${GLOBALS_CSS}`)

  const open = match.index + match[0].length
  let depth = 1
  let close = open
  while (depth > 0) {
    if (close >= withoutComments.length) {
      throw new Error(`Unclosed :root block in ${GLOBALS_CSS}`)
    }
    const char = withoutComments[close]
    if (char === "{") depth += 1
    if (char === "}") depth -= 1
    close += 1
  }
  const body = withoutComments.slice(open, close - 1)

  const declarations = new Map<string, string>()
  for (const [, name, value] of body.matchAll(
    /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g
  )) {
    declarations.set(name, value.trim())
  }
  return declarations
}

function requireColor(declarations: Map<string, string>, name: string): string {
  const value = declarations.get(name)
  if (value === undefined) {
    throw new Error(
      `Missing ${name} in the light :root block of ${GLOBALS_CSS}`
    )
  }
  if (!HEX_COLOR.test(value)) {
    throw new Error(`${name} is not a #rrggbb colour: ${value}`)
  }
  return value
}

/**
 * Writes `#let tokens = (...)` for the Typst template: the light theme colours
 * from `globals.css`, plus an `ansi` dictionary for code-block colours.
 */
export async function writeTokensTypst(outFile: string): Promise<void> {
  const declarations = lightRootDeclarations(
    await fs.promises.readFile(GLOBALS_CSS, "utf-8")
  )

  const colors = COLOR_TOKENS.map(
    ({ css, key }) => `${key}: rgb("${requireColor(declarations, css)}")`
  )
  const ansi = ANSI_NAMES.map(
    (name) =>
      `${name}: rgb("${requireColor(declarations, `--color-ansi-${name}`)}")`
  )

  const body = [...colors, `ansi: (${ansi.join(", ")})`].join(", ")
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true })
  await fs.promises.writeFile(outFile, `#let tokens = (${body})\n`)
}
