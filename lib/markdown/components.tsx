import { CodeBlockPre } from "@/components/code-block-pre"
import { createAComponent } from "@/lib/markdown/a-component"
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
 * Check if a node is an image element.
 */
function isImageElement(node: MarkdownAstNode): boolean {
  return node.type === "element" && node.tagName === "img"
}

function containsImageDescendant(node: MarkdownAstNode): boolean {
  if (isImageElement(node)) return true

  for (const child of getMeaningfulChildren(node.children ?? [])) {
    if (containsImageDescendant(child)) return true
  }

  return false
}

/**
 * Check if a node is a single "image unit":
 * - Direct <img> element
 * - <a> containing exactly one image element
 * - Formatting wrapper (strong/em/del) containing exactly one image element
 */
function isImageUnit(node: MarkdownAstNode): boolean {
  if (node.type !== "element") return false

  // Direct image
  if (node.tagName === "img") return true

  // Allowable wrapper tags that can contain image-only content
  const allowedWrappers = ["a", "strong", "em", "del"]
  if (allowedWrappers.includes(node.tagName ?? "")) {
    const meaningful = getMeaningfulChildren(node.children ?? [])
    return meaningful.length === 1 && isImageElement(meaningful[0])
  }

  return false
}

/**
 * Check if a paragraph contains only image-like content.
 * This prevents invalid HTML nesting like <p><div>...</div></p>
 * when LazyImage (which returns a div) is used inside a paragraph.
 */
function isImageOnlyParagraph(node: unknown) {
  const paragraphNode = node as MarkdownAstNode | undefined
  if (paragraphNode?.tagName !== "p" || !paragraphNode.children) return false

  const meaningfulChildren = getMeaningfulChildren(paragraphNode.children)

  return (
    meaningfulChildren.length === 1 &&
    meaningfulChildren[0]?.type === "element" &&
    isImageUnit(meaningfulChildren[0])
  )
}

function paragraphContainsImage(node: unknown): boolean {
  const paragraphNode = node as MarkdownAstNode | undefined
  if (paragraphNode?.tagName !== "p" || !paragraphNode.children) return false

  return getMeaningfulChildren(paragraphNode.children).some((child) =>
    containsImageDescendant(child)
  )
}

export function getMarkdownComponents(rawPath: string) {
  const aComponent = createAComponent(rawPath)
  const imageComponent = createImageComponent(rawPath)

  const advancedBadge = (
    <span
      aria-hidden="true"
      className="
        mx-1 inline-block shrink-0 border border-violet-400/30 bg-violet-600/5
        px-1.5 py-0.5 align-middle font-mono text-[10px] tracking-tight
        text-violet-400 uppercase
      ">
      ◈ ADV
    </span>
  )

  const makeSpan = (style: Record<string, string>) => {
    function SpanComponent({ ...props }: MarkdownComponentProps) {
      return <span style={style} {...props} />
    }
    SpanComponent.displayName = "makeSpan"
    return SpanComponent
  }

  function hiddenComponent({
    className,
    children,
    ...props
  }: MarkdownComponentProps) {
    return (
      <span
        className={[
          "inline-block rounded-xs border guide-line bg-tech-main/8 px-1.5 py-px text-tech-main/80 transition-[filter,text-shadow,color,background-color,border-color] duration-200 filter-[blur(0.18rem)] [text-shadow:0_0_0.35rem_rgba(96,112,143,0.45)] hover:border-tech-main/35 hover:bg-white/85 hover:text-slate-800 hover:filter-none hover:text-shadow-none",
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
          className="
            mx-1 border border-b-2 border-tech-main/30 bg-tech-main/10 px-1
            py-[0.05rem] font-mono text-[0.8em] text-tech-main not-italic
            transition-colors
            group-hover/lc:border-tech-main group-hover/lc:bg-tech-main/80
            group-hover/lc:text-white
          "
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
        className="
          mx-1 border border-tech-main/30 bg-tech-main/10 px-1 py-[0.05rem]
          font-mono text-[0.8em] text-tech-main not-italic
        "
        {...props}>
        {children}
      </code>
    )
  }

  function preComponent({ children, ...props }: MarkdownComponentProps) {
    return <CodeBlockPre {...props}>{children}</CodeBlockPre>
  }

  return {
    wtucolor: makeSpan({ color: "red" }),
    ttcolor: makeSpan({ color: "#ff7300" }),
    ctcolor: makeSpan({ color: "#ffae00" }),
    becolor: makeSpan({ color: "green" }),
    eucolor: makeSpan({ color: "blue" }),
    tecolor: makeSpan({ color: "blueviolet" }),
    atcolor: makeSpan({ color: "purple" }),
    heightlightnormal: makeSpan({ color: "chartreuse" }),
    nc: ({ ...props }: MarkdownComponentProps) => <span {...props} />,
    pp: ({ ...props }: MarkdownComponentProps) => <span {...props} />,
    hidden: hiddenComponent,
    heightlightwarning: makeSpan({ color: "crimson" }),
    heightlightadvanced: makeSpan({ color: "darkseagreen" }),
    table: ({ ...props }: MarkdownComponentProps) => (
      <div
        className="
          my-6 custom-bottom-scrollbar w-full overflow-x-auto border
          border-tech-main/30 bg-tech-bg/50 backdrop-blur-sm
        ">
        <table
          className="
            w-full min-w-150 border-collapse text-left font-mono text-sm
          "
          {...props}
        />
      </div>
    ),
    thead: ({ ...props }: MarkdownComponentProps) => (
      <thead
        className="border-b border-tech-main/30 bg-tech-main/10"
        {...props}
      />
    ),
    th: ({ ...props }: MarkdownComponentProps) => (
      <th
        className="
          border-r border-tech-main/10 p-3 font-semibold whitespace-nowrap
          text-tech-main
          last:border-r-0
        "
        {...props}
      />
    ),
    td: ({ ...props }: MarkdownComponentProps) => (
      <td
        className="
          border-t border-r border-tech-main/10 p-3 text-slate-700
          last:border-r-0
        "
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
        className="
          group relative mt-8 mb-6 scroll-m-20 border-b border-tech-main/30 pb-4
          font-mono text-2xl tracking-widest text-slate-900 uppercase
          target:animate-target-blink target:border-tech-main
          sm:text-3xl
          lg:text-4xl
        ">
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
        className="
          group relative mt-12 mb-6 inline-block scroll-m-20 border-b
          border-tech-main/30 pr-8 font-mono text-2xl tracking-widest
          text-slate-800 uppercase
          target:animate-target-blink target:border-tech-main
        ">
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
        className="
          group relative mt-8 mb-4 scroll-m-20 font-mono text-xl tracking-widest
          text-slate-700 uppercase
          target:animate-target-blink
        ">
        {id && <HeadingAnchor id={id} level={3} />}
        {children}
        {dataAdvanced === "true" && advancedBadge}
      </h3>
    ),
    p: ({ node, children, ...props }: MarkdownComponentProps) => {
      if (isImageOnlyParagraph(node)) return <>{children}</>

      if (paragraphContainsImage(node)) {
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
        className="
          mb-6 list-disc space-y-2 border-l border-tech-main/30 pl-8 font-sans
          text-[14px] text-slate-800
        "
        {...props}
      />
    ),
    ol: ({ ...props }: MarkdownComponentProps) => (
      <ol
        className="
          mb-6 list-decimal space-y-2 pl-8 font-sans text-[14px] text-slate-800
        "
        {...props}
      />
    ),
    li: ({ ...props }: MarkdownComponentProps) => (
      <li className="relative text-slate-800" {...props} />
    ),
    blockquote: ({ ...props }: MarkdownComponentProps) => (
      <blockquote
        className="
          mb-6 border-l-2 border-tech-main bg-tech-main/5 p-4 pb-[0.01]
          font-sans text-slate-700 italic
        "
        {...props}
      />
    ),
    img: imageComponent,
    hr: ({ ...props }: MarkdownComponentProps) => (
      <hr
        className="mx-auto my-8 w-4/5 border-t border-tech-main/30"
        {...props}
      />
    ),
    sup: ({ ...props }: MarkdownComponentProps) => (
      <sup
        className="
          mx-0.5 cursor-pointer font-mono not-italic
          before:text-tech-main/60 before:content-['{']
          after:text-tech-main/60 after:content-['}']
        "
        {...props}
      />
    ),
    section: ({ id, children, ...props }: MarkdownComponentProps) => {
      // Wrap footnote sections in <aside> for semantic HTML
      if (id === "footnotes") {
        return (
          <aside
            className="
              mt-12 border-t border-tech-main/30 pt-6 font-sans text-sm
              text-slate-700
            "
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
          <div
            className="my-6 overflow-hidden rounded-sm border border-violet-200"
            {...rest}>
            <div className="
              flex items-center gap-2 bg-violet-600/50 px-4 py-1.5
            ">
              <span className="
                font-mono text-[10px] tracking-widest text-white uppercase
              ">
                ◈ Advanced Content
              </span>
            </div>
            <div className="bg-linear-to-b from-violet-50 to-white px-4 pb-2">
              {children}
            </div>
          </div>
        )
      }
      return <div {...rest}>{children}</div>
    },
    pre: preComponent,
    code: codeComponent,
  } as Record<string, MarkdownComponent>
}
