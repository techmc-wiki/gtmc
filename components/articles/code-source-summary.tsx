import {
  formatToolReference,
  type CodeReference,
} from "@/lib/markdown/code-provenance"

interface CodeSourceSummaryProps {
  label: string
  mixedLabel: string
  referenceLabel: string
  references: readonly CodeReference[]
}

export function CodeSourceSummary({
  label,
  mixedLabel,
  referenceLabel,
  references,
}: CodeSourceSummaryProps) {
  if (references.length === 0) return null

  const sourceBases = [
    ...new Map(
      references.map((reference) => {
        const mapping = formatToolReference(reference.mapping)
        return [
          `${reference.minecraftVersion}\u0000${mapping}`,
          `MC ${reference.minecraftVersion} · ${mapping}`,
        ]
      })
    ).values(),
  ]
  const versionCount = new Set(
    references.map((reference) => reference.minecraftVersion)
  ).size

  return (
    <aside
      aria-label={label}
      className="border-tech-main/20 bg-tech-main/5 text-tech-main/65 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border px-3 py-2 font-mono text-[0.625rem] tracking-wider uppercase">
      <span className="text-tech-main/45">{label}</span>
      {sourceBases.map((sourceBase) => (
        <span key={sourceBase} className="text-tech-main">
          {sourceBase}
        </span>
      ))}
      <span aria-hidden="true" className="text-tech-main/30">
        |
      </span>
      <span>{referenceLabel}</span>
      {versionCount > 1 && (
        <span className="border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-800 dark:text-amber-200">
          {mixedLabel}
        </span>
      )}
    </aside>
  )
}
