import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function AdvancedSectionDivComponent({
  children,
  "data-advanced-section": dataAdvancedSection,
  ...rest
}: MarkdownComponentProps) {
  if (dataAdvancedSection === "true") {
    return (
      <div className="group relative my-8" {...rest}>
        <div className="absolute top-0 left-[calc(100%+1.5rem)] z-10 flex h-full w-3.5 -translate-x-1/2 items-start justify-center rounded-sm bg-[#8b9ac8] pt-6 sm:left-[calc(100%+2rem)]">
          <span className="font-mono text-[0.625rem] leading-none font-bold tracking-[0.3em] text-white select-none [writing-mode:vertical-rl]">
            ADVANCED
          </span>
        </div>
        <div className="relative z-0 w-full">{children}</div>
      </div>
    )
  }
  return <div {...rest}>{children}</div>
}
