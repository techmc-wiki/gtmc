import type { ReactNode } from "react"

import type { MarkdownComponentProps } from "@/lib/markdown/component-types"
import { HeadingAnchor } from "@/lib/markdown/heading-anchor"

const advancedBadge = (
  <span
    aria-hidden="true"
    className="bg-tech-advanced mx-2 inline-block shrink-0 px-1.5 py-0.5 align-middle font-mono text-[0.625rem] font-bold tracking-widest text-white select-none">
    ADVANCED
  </span>
)

interface H1ComponentProps extends MarkdownComponentProps {
  /** Optional control rendered at the right edge of the heading row. */
  action?: ReactNode
}

export function H1Component({
  id,
  children,
  "data-advanced": dataAdvanced,
  action,
}: H1ComponentProps) {
  const heading = (
    <>
      {id && <HeadingAnchor id={id} level={1} />}
      {children}
      {dataAdvanced === "true" && advancedBadge}
    </>
  )

  return (
    <h1
      id={id}
      className={`markdown-title group border-tech-main-dark/60 target:animate-target-blink target:border-tech-signal text-tech-main-dark relative mt-8 mb-5 border-b-2 pb-3 text-2xl leading-tight font-semibold text-balance sm:text-3xl lg:text-4xl${action ? " flex items-start gap-4" : ""} `}>
      {action ? <span className="min-w-0 flex-1">{heading}</span> : heading}
      {action}
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
      className="markdown-title group border-tech-main/40 target:animate-target-blink target:border-tech-signal text-tech-main-dark relative mt-10 mb-4 block w-fit max-w-full border-b pr-8 pb-2 text-2xl leading-tight font-semibold text-balance">
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
      className="markdown-title group border-tech-signal target:animate-target-blink text-tech-main-dark relative mt-7 mb-3 border-l-2 pl-3 text-xl leading-snug font-semibold text-balance">
      {id && <HeadingAnchor id={id} level={3} />}
      {children}
      {dataAdvanced === "true" && advancedBadge}
    </h3>
  )
}
