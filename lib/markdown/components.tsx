import { useTranslations } from "next-intl"
import { CodeBlockPre } from "@/components/code-block-pre"
import LitematicaViewer from "@/components/articles/litematica-viewer"
import { PeopleMention } from "@/components/markdown/people-mention"
import { createAComponent } from "@/lib/markdown/a-component"
import {
  ANSI_COLOR_NAMES,
  createAnsiColorTagName,
  type AnsiColorName,
} from "@/lib/markdown/ansi-colors"
import type {
  MarkdownAstNode,
  MarkdownComponent,
  MarkdownComponentProps,
} from "@/lib/markdown/component-types"
import { HeadingAnchor } from "@/lib/markdown/heading-anchor"
import { createImageComponent } from "@/lib/markdown/image-component"

/**
 * Filter children to exclude whitespace-only text nodes.
 */
function getMeaningfulChildren(
  children?: MarkdownAstNode[]
): MarkdownAstNode[] {
  if (!children) return []
  return children.filter(
    (child) => !(child.type === "text" && child.value?.trim() === "")
  )
}

/**
 * Check if a node is an image or iframe element.
 */
function isImageOrIframeElement(node: MarkdownAstNode): boolean {
  return (
    node.type === "element" &&
    (node.tagName === "img" ||
      node.tagName === "iframe" ||
      node.tagName === "litematicaviewer")
  )
}

function containsImageOrIframeDescendant(node: MarkdownAstNode): boolean {
  if (isImageOrIframeElement(node)) return true

  for (const child of getMeaningfulChildren(node.children ?? [])) {
    if (containsImageOrIframeDescendant(child)) return true
  }

  return false
}

/**
 * Check if a node is a single "image/iframe unit":
 * - Direct <img> or <iframe> element
 * - <a> containing exactly one image/iframe element
 * - Formatting wrapper (strong/em/del) containing exactly one image/iframe element
 */
function isImageOrIframeUnit(node: MarkdownAstNode): boolean {
  if (node.type !== "element") return false

  // Direct image or iframe
  if (node.tagName === "img" || node.tagName === "iframe") return true

  // Allowable wrapper tags that can contain media-only content
  const allowedWrappers = ["a", "strong", "em", "del"]
  if (allowedWrappers.includes(node.tagName ?? "")) {
    const meaningful = getMeaningfulChildren(node.children ?? [])
    return meaningful.length === 1 && isImageOrIframeElement(meaningful[0])
  }

  return false
}

/**
 * Check if a paragraph contains only image/iframe content.
 * This prevents invalid HTML nesting like <p><div>...</div></p>
 * when LazyImage or Iframe mapping (which returns a div) is used inside a paragraph.
 */
function isMediaOnlyParagraph(node: unknown) {
  const paragraphNode = node as MarkdownAstNode | undefined
  if (paragraphNode?.tagName !== "p" || !paragraphNode.children) return false

  const meaningfulChildren = getMeaningfulChildren(paragraphNode.children)

  return (
    meaningfulChildren.length === 1 &&
    meaningfulChildren[0]?.type === "element" &&
    isImageOrIframeUnit(meaningfulChildren[0])
  )
}

function paragraphContainsMedia(node: unknown): boolean {
  const paragraphNode = node as MarkdownAstNode | undefined
  if (paragraphNode?.tagName !== "p" || !paragraphNode.children) return false

  return getMeaningfulChildren(paragraphNode.children).some((child) =>
    containsImageOrIframeDescendant(child)
  )
}

type CalloutStyle = {
  border: string
  bg: string
  title: string
  text: string
}

const CALLOUT_STYLES = {
  warning: {
    border: "border-amber-500",
    bg: "bg-amber-50",
    title: "text-amber-700",
    text: "text-amber-900",
  },
  tip: {
    border: "border-emerald-500",
    bg: "bg-emerald-50",
    title: "text-emerald-700",
    text: "text-emerald-900",
  },
  important: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    title: "text-blue-700",
    text: "text-blue-900",
  },
  crash: {
    border: "border-red-500",
    bg: "bg-red-50",
    title: "text-red-700",
    text: "text-red-900",
  },
  corruption: {
    border: "border-orange-500",
    bg: "bg-orange-50",
    title: "text-orange-700",
    text: "text-orange-900",
  },
} as const satisfies Record<string, CalloutStyle>

type CalloutType = keyof typeof CALLOUT_STYLES

const CALLOUT_TYPES_WITH_DEFAULT = [
  "crash",
  "corruption",
] as const satisfies readonly CalloutType[]

function isCalloutType(type: string): type is CalloutType {
  return type in CALLOUT_STYLES
}

function CalloutAside({
  "data-callout": dataCallout,
  "data-callout-empty": dataCalloutEmpty,
  children,
  ...rest
}: MarkdownComponentProps) {
  const t = useTranslations("callouts")

  if (!dataCallout) {
    return <aside {...rest}>{children}</aside>
  }

  const type = String(dataCallout)
  const styles = isCalloutType(type)
    ? CALLOUT_STYLES[type]
    : CALLOUT_STYLES.important
  const labelKey = `${type}_label` as Parameters<typeof t>[0]
  const isEmpty = dataCalloutEmpty === "true"
  const hasDefault = CALLOUT_TYPES_WITH_DEFAULT.some(
    (defaultType) => defaultType === type
  )

  return (
    <aside
      className={`mb-4 border-l-2 px-6 py-4 ${styles.border} ${styles.bg}`}
      {...rest}>
      <div
        className={`mb-1.5 font-mono text-xs font-bold tracking-widest uppercase ${styles.title}`}>
        {t(labelKey)}
      </div>
      <div
        className={`font-sans text-sm [&_p]:mb-0 [&_p]:text-sm [&_p]:text-inherit ${styles.text}`}>
        {isEmpty && hasDefault
          ? t(`${type}_default` as Parameters<typeof t>[0])
          : children}
      </div>
    </aside>
  )
}

export function getMarkdownComponents(
  rawPath: string
): Record<string, MarkdownComponent> {
  const aComponent = createAComponent(rawPath)
  const imageComponent = createImageComponent(rawPath)
  const ansiColorStyles: Record<AnsiColorName, Record<string, string>> = {
    black: { color: "#334155" },
    red: { color: "#b91c1c" },
    green: { color: "#047857" },
    yellow: { color: "#a16207" },
    blue: { color: "#2563eb" },
    magenta: { color: "#a21caf" },
    cyan: { color: "#0f766e" },
    white: { color: "#64748b" },
    "bright-black": { color: "#0f172a" },
    "bright-red": { color: "#dc2626" },
    "bright-green": { color: "#059669" },
    "bright-yellow": { color: "#ca8a04" },
    "bright-blue": { color: "#1d4ed8" },
    "bright-magenta": { color: "#c026d3" },
    "bright-cyan": { color: "#0891b2" },
    "bright-white": { color: "#475569" },
  }

  const advancedBadge = (
    <span
      aria-hidden="true"
      className="mx-2 inline-block shrink-0 bg-[#4c5b96] px-1.5 py-0.5 align-middle font-mono text-[0.625rem] font-bold tracking-widest text-white select-none">
      ADVANCED
    </span>
  )

  const makeSpan = (style: Record<string, string>) => {
    function SpanComponent({ node: _node, ...props }: MarkdownComponentProps) {
      return <span style={style} {...props} />
    }
    SpanComponent.displayName = "makeSpan"
    return SpanComponent
  }

  function hiddenComponent({
    className,
    children,
    node: _node,
    ...props
  }: MarkdownComponentProps) {
    return (
      <span
        className={[
          "guide-line bg-tech-main/8 text-tech-main/80 hover:border-tech-main/35 inline-block rounded-xs border px-1.5 py-px filter-[blur(0.18rem)] transition-[filter,text-shadow,color,background-color,border-color] duration-200 [text-shadow:0_0_0.35rem_rgb(var(--color-tech-main)/0.45)] hover:bg-white/85 hover:text-slate-800 hover:filter-none hover:text-shadow-none",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}>
        {children}
      </span>
    )
  }

  function codeComponent({
    className,
    children,
    node,
    ...props
  }: MarkdownComponentProps) {
    if (props["data-linked-code"] === "true") {
      const { "data-linked-code": _linkedCode, ...rest } = props
      return (
        <code
          className="border-tech-main/30 bg-tech-main/10 text-tech-main group-hover/lc:border-tech-main group-hover/lc:bg-tech-main/80 mx-1 border border-b-2 px-1 py-[0.05rem] font-mono text-[0.8em] not-italic transition-colors group-hover/lc:text-white"
          {...rest}>
          {children}
        </code>
      )
    }
    if (props["data-has-link"] === "true") {
      const { "data-has-link": _hasLink, ...rest } = props
      return (
        <code className="font-mono text-[0.8em] not-italic" {...rest}>
          {children}
        </code>
      )
    }
    if ((className as string)?.startsWith("language-"))
      return (
        <code className={className as string} {...props}>
          {children}
        </code>
      )
    return (
      <code
        className="border-tech-main/30 bg-tech-main/10 text-tech-main mx-1 border px-1 py-[0.05rem] font-mono text-[0.8em] not-italic"
        {...props}>
        {children}
      </code>
    )
  }

  function preComponent({ children, ...props }: MarkdownComponentProps) {
    return <CodeBlockPre {...props}>{children}</CodeBlockPre>
  }

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
    hidden: hiddenComponent,
    litematicaviewer: ({ url, ...rest }: MarkdownComponentProps) => (
      <LitematicaViewer url={url as string} {...rest} />
    ),
    table: ({ ...props }: MarkdownComponentProps) => (
      <div className="custom-bottom-scrollbar border-tech-main/30 bg-tech-bg/50 my-6 w-full overflow-x-auto border backdrop-blur-sm">
        <table
          className="w-full min-w-150 border-collapse text-left font-mono text-sm"
          {...props}
        />
      </div>
    ),
    thead: ({ ...props }: MarkdownComponentProps) => (
      <thead
        className="border-tech-main/30 bg-tech-main/10 border-b"
        {...props}
      />
    ),
    th: ({ ...props }: MarkdownComponentProps) => (
      <th
        className="border-tech-main/10 text-tech-main border-r p-3 font-semibold whitespace-nowrap last:border-r-0"
        {...props}
      />
    ),
    td: ({ ...props }: MarkdownComponentProps) => (
      <td
        className="border-tech-main/10 border-t border-r p-3 text-slate-700 last:border-r-0"
        {...props}
      />
    ),
    h1: ({
      id,
      children,
      "data-advanced": dataAdvanced,
    }: MarkdownComponentProps) => (
      <h1
        id={id}
        className="group border-tech-main/30 target:animate-target-blink target:border-tech-main relative mt-8 mb-6 scroll-m-20 border-b pb-4 font-mono text-2xl tracking-widest text-slate-900 uppercase sm:text-3xl lg:text-4xl">
        {id && <HeadingAnchor id={id} level={1} />}
        {children}
        {dataAdvanced === "true" && advancedBadge}
      </h1>
    ),
    h2: ({
      id,
      children,
      "data-advanced": dataAdvanced,
    }: MarkdownComponentProps) => (
      <h2
        id={id}
        className="group border-tech-main/30 target:animate-target-blink target:border-tech-main relative mt-12 mb-6 inline-block scroll-m-20 border-b pr-8 font-mono text-2xl tracking-widest text-slate-800 uppercase">
        {id && <HeadingAnchor id={id} level={2} />}
        {children}
        {dataAdvanced === "true" && advancedBadge}
      </h2>
    ),
    h3: ({
      id,
      children,
      "data-advanced": dataAdvanced,
    }: MarkdownComponentProps) => (
      <h3
        id={id}
        className="group target:animate-target-blink relative mt-8 mb-4 scroll-m-20 font-mono text-xl tracking-widest text-slate-700 uppercase">
        {id && <HeadingAnchor id={id} level={3} />}
        {children}
        {dataAdvanced === "true" && advancedBadge}
      </h3>
    ),
    p: ({ node, children, ...props }: MarkdownComponentProps) => {
      if (isMediaOnlyParagraph(node)) return <>{children}</>

      if (paragraphContainsMedia(node)) {
        return (
          <div className="mb-4 font-sans text-base/relaxed text-slate-800">
            {children}
          </div>
        )
      }

      return (
        <p
          className="mb-4 font-sans text-base/relaxed text-slate-800"
          {...props}>
          {children}
        </p>
      )
    },
    a: aComponent,
    ul: ({ ...props }: MarkdownComponentProps) => (
      <ul
        className="border-tech-main/30 mb-6 list-disc space-y-2 border-l pl-8 font-sans text-slate-800"
        {...props}
      />
    ),
    ol: ({ ...props }: MarkdownComponentProps) => (
      <ol
        className="mb-6 list-decimal space-y-2 pl-8 font-sans text-slate-800"
        {...props}
      />
    ),
    li: ({ ...props }: MarkdownComponentProps) => (
      <li className="relative text-slate-800" {...props} />
    ),
    blockquote: ({ ...props }: MarkdownComponentProps) => (
      <blockquote
        className="border-tech-main bg-tech-main/5 mb-6 border-l-2 p-4 pb-[0.01] font-sans text-slate-700 italic"
        {...props}
      />
    ),
    aside: (props: MarkdownComponentProps) => <CalloutAside {...props} />,
    img: imageComponent,
    hr: ({ ...props }: MarkdownComponentProps) => (
      <hr
        className="border-tech-main/30 mx-auto my-8 w-4/5 border-t"
        {...props}
      />
    ),
    sup: ({ ...props }: MarkdownComponentProps) => (
      <sup
        className="before:text-tech-main/60 after:text-tech-main/60 mx-0.5 cursor-pointer font-mono not-italic before:content-['{'] after:content-['}']"
        {...props}
      />
    ),
    section: ({ id, children, ...props }: MarkdownComponentProps) => {
      // Wrap footnote sections in <aside> for semantic HTML
      if (id === "footnotes") {
        return (
          <aside
            className="border-tech-main/30 mt-12 border-t pt-6 font-sans text-sm text-slate-700"
            {...props}>
            <section id={id} {...props}>
              {children}
            </section>
          </aside>
        )
      }

      // Regular sections render normally
      return (
        <section id={id} {...props}>
          {children}
        </section>
      )
    },
    div: ({
      children,
      "data-advanced-section": dataAdvancedSection,
      ...rest
    }: MarkdownComponentProps) => {
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
    },
    pre: preComponent,
    code: codeComponent,
    "people-mention": PeopleMention,
    iframe: ({
      src,
      className,
      title,
      allowFullScreen,
      ...props
    }: MarkdownComponentProps) => {
      // Remove deprecated or non-standard DOM attributes
      const {
        frameborder,
        frameBorder,
        scrolling,
        framespacing,
        marginheight,
        marginwidth,
        allowfullscreen,

        node,
        ...rest
      } = props as Record<string, unknown>

      return (
        <div className="guide-line bg-tech-main/5 my-6 aspect-video w-full overflow-hidden rounded-xs border">
          <iframe
            src={src as string}
            title={(title as string) || "Embedded Video"}
            className="size-full"
            loading="lazy"
            allowFullScreen={allowFullScreen !== false}
            {...rest}
          />
        </div>
      )
    },
  } satisfies Record<string, MarkdownComponent>
}
