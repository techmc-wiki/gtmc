import type {
  MarkdownAstNode,
  MarkdownComponentProps,
} from "@/lib/markdown/component-types"

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
