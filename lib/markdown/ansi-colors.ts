export const ANSI_COLOR_NAMES = [
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

export type AnsiColorName = (typeof ANSI_COLOR_NAMES)[number]

const ANSI_COLOR_ALTERNATION = ANSI_COLOR_NAMES.join("|")

export const ANSI_COLOR_TAG_PATTERN = new RegExp(
  String.raw`\[(${ANSI_COLOR_ALTERNATION})\]([\s\S]*?)\[/\1\]`,
  "g"
)

export function createAnsiColorTagName(color: AnsiColorName) {
  return `ansi-color-${color}`
}

export function stripAnsiColorMarkup(markdown: string) {
  return markdown.replace(ANSI_COLOR_TAG_PATTERN, "$2")
}
