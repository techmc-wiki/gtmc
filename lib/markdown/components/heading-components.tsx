import type { MarkdownComponentProps } from "@/lib/markdown/component-types"
import { HeadingAnchor } from "@/lib/markdown/heading-anchor"

const advancedBadge = (
  <span
    aria-hidden="true"
    className="bg-tech-advanced mx-2 inline-block shrink-0 px-1.5 py-0.5 align-middle font-mono text-[0.625rem] font-bold tracking-widest text-white select-none">
    ADVANCED
  </span>
)

export function H1Component({
  id,
  children,
  "data-advanced": dataAdvanced,
}: MarkdownComponentProps) {
  return (
    <h1
      id={id}
      className="group border-tech-main/30 target:animate-target-blink target:border-tech-main relative mt-8 mb-6 scroll-m-20 border-b pb-4 font-mono text-2xl tracking-widest text-slate-900 uppercase sm:text-3xl lg:text-4xl">
      {id && <HeadingAnchor id={id} level={1} />}
      {children}
      {dataAdvanced === "true" && advancedBadge}
    </h1>
  )
}

export function H2Component({
  id,
  children,
  "data-advanced": dataAdvanced,
}: MarkdownComponentProps) {
  return (
    <h2
      id={id}
      className="group border-tech-main/30 target:animate-target-blink target:border-tech-main relative mt-12 mb-6 inline-block scroll-m-20 border-b pr-8 font-mono text-2xl tracking-widest text-slate-800 uppercase">
      {id && <HeadingAnchor id={id} level={2} />}
      {children}
      {dataAdvanced === "true" && advancedBadge}
    </h2>
  )
}

export function H3Component({
  id,
  children,
  "data-advanced": dataAdvanced,
}: MarkdownComponentProps) {
  return (
    <h3
      id={id}
      className="group target:animate-target-blink relative mt-8 mb-4 scroll-m-20 font-mono text-xl tracking-widest text-slate-700 uppercase">
      {id && <HeadingAnchor id={id} level={3} />}
      {children}
      {dataAdvanced === "true" && advancedBadge}
    </h3>
  )
}
