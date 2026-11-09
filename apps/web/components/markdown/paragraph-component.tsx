import type {
  MarkdownAstNode,
  MarkdownComponentProps,
} from "@/lib/markdown/component-types"

function getMeaningfulChildren(
  children?: MarkdownAstNode[]
): MarkdownAstNode[] {
  if (!children) return []
  return children.filter(
    (child) => !(child.type === "text" && child.value?.trim() === "")
  )
}

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

function isImageOrIframeUnit(node: MarkdownAstNode): boolean {
  if (node.type !== "element") return false

  if (node.tagName === "img" || node.tagName === "iframe") return true

  const allowedWrappers = ["a", "strong", "em", "del"]
  if (allowedWrappers.includes(node.tagName ?? "")) {
    const meaningful = getMeaningfulChildren(node.children ?? [])
    return meaningful.length === 1 && isImageOrIframeElement(meaningful[0])
  }

  return false
}

/** Keep media-only paragraphs unwrapped so mapped media can use block layout without creating invalid nested block HTML. */
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

export function ParagraphComponent({
  node,
  children,
  ...props
}: MarkdownComponentProps) {
  if (isMediaOnlyParagraph(node)) return <>{children}</>

  if (paragraphContainsMedia(node)) {
    return (
      <div className="text-tech-main-dark mb-4 font-sans text-base/relaxed">
        {children}
      </div>
    )
  }

  return (
    <p
      className="text-tech-main-dark mb-4 font-sans text-base/relaxed"
      {...props}>
      {children}
    </p>
  )
}
