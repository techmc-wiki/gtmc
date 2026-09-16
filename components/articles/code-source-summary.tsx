import {
  formatToolReference,
  type CodeReference,
} from "@/lib/markdown/code-provenance"
import { Separator } from "@/components/ui/shadcn/separator"

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

  // One base per (version, mapping) pair; the mapping reads the version, so the
  // two stay grouped and each is its own token.
  const sourceBases = [
    ...new Map(
      references.map((reference) => {
        const mapping = formatToolReference(reference.mapping)
        return [
          `${reference.minecraftVersion}\u0000${mapping}`,
          { minecraftVersion: reference.minecraftVersion, mapping },
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
      className="border-tech-main/20 bg-tech-main/5 text-tech-main/65 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border px-3 py-2 font-mono text-xs tracking-wider uppercase">
      <span className="text-tech-main/45">{label}</span>
      {sourceBases.map((sourceBase) => (
        <span
          key={`${sourceBase.minecraftVersion}\u0000${sourceBase.mapping}`}
          className="text-tech-main inline-flex items-center gap-x-2">
          <span>MC {sourceBase.minecraftVersion}</span>
          <Separator
            orientation="vertical"
            className="bg-tech-main/25 h-3"
          />
          <span>{sourceBase.mapping}</span>
        </span>
      ))}
      <Separator
        orientation="vertical"
        className="bg-tech-main/25 h-3"
      />
      <span>{referenceLabel}</span>
      {versionCount > 1 && (
        <span className="border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-800 dark:text-amber-200">
          {mixedLabel}
        </span>
      )}
    </aside>
  )
}
