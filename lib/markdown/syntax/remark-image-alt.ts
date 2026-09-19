import type { Root, Image, Node, Literal } from "mdast"
import { visit } from "unist-util-visit"

const FILENAME_ALT_PATTERN =
  /^[\p{L}\p{N}\-._ ]+\.(png|jpe?g|gif|webp|svg|bmp|tiff)$/iu
const CAPTION_STARTER_PATTERN = /^(?:图|Figure|Fig\.)\s*[\d.]+/iu
const TRAILING_PROMPT_PATTERN =
  /(?:效果如下|如下所示|示例如下|如下图所示|如图所示|，效果如下|，示例如下|最终结果如图|最终结果如下图|效果如图|如下图|如图|Example)\s*[:：]?\s*$/iu
const TRAILING_PUNCTUATION_PATTERN = /[,，:：、\-—~_]\s*$/

function extractText(node: unknown): string {
  let text = ""
  visit(node as Node, (n: Node) => {
    if ("value" in n && typeof (n as Literal).value === "string") {
      text += (n as Literal).value
    }
  })
  return text.trim()
}

function cleanFilename(url: string): string {
  try {
    const filename = url.split("/").pop()?.split("?")[0] || ""
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")
    return decodeURIComponent(nameWithoutExt)
      .replaceAll(/[-_.]+/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim()
  } catch {
    return ""
  }
}

function cleanSentence(text: string): string {
  if (!text) return ""
  const lines = text.split(/[\n\r]+/)
  let candidate = lines[lines.length - 1]?.trim() ?? ""
  if (!candidate && lines.length > 1) {
    candidate = lines[lines.length - 2]?.trim() ?? ""
  }
  return candidate
    .replace(TRAILING_PUNCTUATION_PATTERN, "")
    .replace(TRAILING_PROMPT_PATTERN, "")
    .replace(TRAILING_PUNCTUATION_PATTERN, "")
    .replaceAll(/\s+/g, " ")
    .trim()
}

function hasMeaningfulAlt(alt: string | null | undefined): boolean {
  if (!alt) return false
  const trimmed = alt.trim()
  if (trimmed.length === 0) return false
  if (FILENAME_ALT_PATTERN.test(trimmed)) return false
  const lower = trimmed.toLowerCase()
  if (
    lower === "image" ||
    lower === "untitled" ||
    lower === "photo" ||
    lower === "picture"
  ) {
    return false
  }
  return true
}

/**
 * Remark plugin that derives contextual, descriptive alt text for images that
 * lack descriptive alt text or use raw filenames as alt.
 *
 * Sources (in priority order):
 * 1. Caption blockquote or caption paragraph immediately following the image
 * 2. Preceding inline sentence in the same paragraph
 * 3. Preceding introductory paragraph
 * 4. Current section heading
 * 5. Cleaned image filename
 */
export function remarkImageAlt() {
  return (tree: Root) => {
    if (!tree || !tree.children) return

    let currentHeading = ""

    function walk(parent: { children?: Node[] }) {
      if (!parent || !parent.children) return

      for (let i = 0; i < parent.children.length; i++) {
        const node = parent.children[i]
        if (!node) continue

        if (node.type === "heading") {
          currentHeading = extractText(node)
          continue
        }

        if (node.type === "listItem" || node.type === "blockquote") {
          walk(node as { children?: Node[] })
        }

        const images: Image[] = []
        visit(node, "image", (img: Image) => {
          images.push(img)
        })

        if (images.length === 0) continue

        // 1. Next sibling caption (blockquote or paragraph starting with Fig./图)
        let caption = ""
        const nextNode = parent.children[i + 1]
        if (nextNode) {
          if (nextNode.type === "blockquote") {
            caption = extractText(nextNode)
          } else if (nextNode.type === "paragraph") {
            const text = extractText(nextNode)
            if (CAPTION_STARTER_PATTERN.test(text)) {
              caption = text
            }
          }
        }

        // 2. Preceding inline text if image is inside a paragraph
        let inlineText = ""
        if (
          node.type === "paragraph" &&
          "children" in node &&
          Array.isArray(node.children)
        ) {
          const beforeTexts: string[] = []
          for (const child of node.children as Node[]) {
            if (child.type === "image") break
            if (
              (child.type === "text" || child.type === "inlineCode") &&
              "value" in child &&
              typeof child.value === "string"
            ) {
              beforeTexts.push(child.value)
            }
          }
          inlineText = cleanSentence(beforeTexts.join(""))
        }

        // 3. Preceding paragraph text
        let precedingContext = ""
        const prevNode = parent.children[i - 1]
        if (prevNode && prevNode.type === "paragraph") {
          precedingContext = cleanSentence(extractText(prevNode))
        }

        images.forEach((img, idx) => {
          if (!hasMeaningfulAlt(img.alt)) {
            let derived = ""
            if (caption) {
              derived = images.length > 1 ? `${caption} (${idx + 1})` : caption
            } else if (inlineText) {
              derived = inlineText
            } else if (precedingContext) {
              derived = precedingContext
            } else if (currentHeading) {
              derived = currentHeading
            } else {
              derived = cleanFilename(img.url)
            }

            img.alt = derived.replaceAll(/\s+/g, " ").trim()
          }
        })
      }
    }

    walk(tree)
  }
}
