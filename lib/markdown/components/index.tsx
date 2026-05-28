import LitematicaViewer from "@/components/articles/litematica-viewer"
import { PeopleMention } from "@/components/markdown/people-mention"
import { createAComponent } from "@/lib/markdown/a-component"
import {
  ANSI_COLOR_NAMES,
  createAnsiColorTagName,
  type AnsiColorName,
} from "@/lib/markdown/ansi-colors"
import type {
  MarkdownComponent,
  MarkdownComponentProps,
} from "@/lib/markdown/component-types"
import { createImageComponent } from "@/lib/markdown/image-component"
import { AdvancedSectionDivComponent } from "./advanced-section"
import { CalloutAside } from "./callout-aside"
import { CodeComponent, PreComponent } from "./code-components"
import { H1Component, H2Component, H3Component } from "./heading-components"
import { IframeComponent } from "./iframe-component"
import {
  BlockquoteComponent,
  HrComponent,
  SupComponent,
} from "./misc-components"
import { OrderedListComponent, UnorderedListComponent } from "./list-components"
import { ParagraphComponent } from "./paragraph-component"
import { SectionComponent } from "./section-component"
import { makeSpan } from "./span-components"
import {
  TableComponent,
  TableDataCell,
  TableHead,
  TableHeaderCell,
} from "./table-components"

const ansiColorStyles: Record<AnsiColorName, Record<string, string>> = {
  black: { color: "var(--color-ansi-black)" },
  red: { color: "var(--color-ansi-red)" },
  green: { color: "var(--color-ansi-green)" },
  yellow: { color: "var(--color-ansi-yellow)" },
  blue: { color: "var(--color-ansi-blue)" },
  magenta: { color: "var(--color-ansi-magenta)" },
  cyan: { color: "var(--color-ansi-cyan)" },
  white: { color: "var(--color-ansi-white)" },
  "bright-black": { color: "var(--color-ansi-bright-black)" },
  "bright-red": { color: "var(--color-ansi-bright-red)" },
  "bright-green": { color: "var(--color-ansi-bright-green)" },
  "bright-yellow": { color: "var(--color-ansi-bright-yellow)" },
  "bright-blue": { color: "var(--color-ansi-bright-blue)" },
  "bright-magenta": { color: "var(--color-ansi-bright-magenta)" },
  "bright-cyan": { color: "var(--color-ansi-bright-cyan)" },
  "bright-white": { color: "var(--color-ansi-bright-white)" },
}

export function getMarkdownComponents(
  rawPath: string
): Record<string, MarkdownComponent> {
  const aComponent = createAComponent(rawPath)
  const imageComponent = createImageComponent(rawPath)
  const ansiColorComponents = Object.fromEntries(
    ANSI_COLOR_NAMES.map((color) => [
      createAnsiColorTagName(color),
      makeSpan(ansiColorStyles[color]),
    ])
  ) satisfies Record<string, MarkdownComponent>

  return {
    ...ansiColorComponents,
    wtucolor: makeSpan({ color: "red" }),
    ttcolor: makeSpan({ color: "#ff7300" }),
    ctcolor: makeSpan({ color: "#ffae00" }),
    becolor: makeSpan({ color: "green" }),
    eucolor: makeSpan({ color: "blue" }),
    tecolor: makeSpan({ color: "blueviolet" }),
    atcolor: makeSpan({ color: "purple" }),
    nc: ({ node: _node, ...props }: MarkdownComponentProps) => (
      <span {...props} />
    ),
    pp: ({ node: _node, ...props }: MarkdownComponentProps) => (
      <span {...props} />
    ),
    hidden: HiddenComponent,
    litematicaviewer: ({ url, ...rest }: MarkdownComponentProps) => (
      <LitematicaViewer url={url as string} {...rest} />
    ),
    table: TableComponent,
    thead: TableHead,
    th: TableHeaderCell,
    td: TableDataCell,
    h1: H1Component,
    h2: H2Component,
    h3: H3Component,
    p: ParagraphComponent,
    a: aComponent,
    ul: UnorderedListComponent,
    ol: OrderedListComponent,
    li: ({ ...props }: MarkdownComponentProps) => (
      <li className="text-tech-main-dark relative" {...props} />
    ),
    blockquote: BlockquoteComponent,
    aside: CalloutAside,
    img: imageComponent,
    hr: HrComponent,
    sup: SupComponent,
    section: SectionComponent,
    div: AdvancedSectionDivComponent,
    pre: PreComponent,
    code: CodeComponent,
    "people-mention": PeopleMention,
    iframe: IframeComponent,
  } satisfies Record<string, MarkdownComponent>
}

function HiddenComponent({
  className,
  children,
  node: _node,
  ...props
}: MarkdownComponentProps) {
  return (
    <span
      className={[
        "guide-line bg-tech-main/8 text-tech-main/80 hover:border-tech-main/35 hover:bg-surface-overlay/85 hover:text-tech-main-dark inline-block rounded-xs border px-1.5 py-px filter-[blur(0.18rem)] transition-[filter,text-shadow,color,background-color,border-color] duration-200 [text-shadow:0_0_0.35rem_rgb(var(--color-tech-main)/0.45)] hover:filter-none hover:text-shadow-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}>
      {children}
    </span>
  )
}
