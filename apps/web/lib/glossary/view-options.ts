export const GLOSSARY_COLUMNS = ["term", "shortForm", "description"] as const

export type GlossaryColumn = (typeof GLOSSARY_COLUMNS)[number]

export function isGlossaryColumn(column: unknown): column is GlossaryColumn {
  return (
    typeof column === "string" &&
    (GLOSSARY_COLUMNS as readonly string[]).includes(column)
  )
}
