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
      className="markdown-title group border-tech-main/30 target:animate-target-blink target:border-tech-main text-tech-main-dark relative mt-8 mb-5 scroll-m-20 border-b pb-3 text-2xl leading-tight font-bold text-balance sm:text-3xl lg:text-4xl">
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
      className="markdown-title group border-tech-main/30 target:animate-target-blink target:border-tech-main text-tech-main-dark relative mt-10 mb-4 block w-fit max-w-full scroll-m-20 border-b pr-8 pb-2 text-2xl leading-tight font-bold text-balance">
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
      className="markdown-title group border-tech-main/30 target:animate-target-blink target:border-tech-main text-tech-main-dark relative mt-7 mb-3 scroll-m-20 border-l pl-3 text-xl leading-snug font-bold text-balance">
      {id && <HeadingAnchor id={id} level={3} />}
      {children}
      {dataAdvanced === "true" && advancedBadge}
    </h3>
  )
}
