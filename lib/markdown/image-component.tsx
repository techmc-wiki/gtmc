import { ArticleImage } from "@/components/markdown/article-image"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"
import { hasExplicitUrlScheme, resolveRelativeArticlePath } from "./url-utils"

function decodeImageSource(src: string): string {
  try {
    return decodeURI(src)
  } catch {
    return src
  }
}
function getFallbackImageAlt(
  alt: unknown,
  src: string,
  rawPath: string
): string {
  if (typeof alt === "string" && alt.trim().length > 0) {
    return alt.trim()
  }

  const filename = src.split("/").pop()?.split("?")[0] || ""
  try {
    const nameWithoutExt = decodeURIComponent(filename)
      .replace(/\.[^/.]+$/, "")
      .replaceAll(/[-_.]+/g, " ")
      .trim()
    if (nameWithoutExt) return nameWithoutExt
  } catch {
    if (filename) return filename
  }

  const articleName = rawPath
    .split("/")
    .pop()
    ?.replace(/\.(?:zh|en)?\.mdx?$/iu, "")
  if (articleName) return `${articleName} illustration`

  return "Article illustration"
}

export function createImageComponent(rawPath: string) {
  function ImageComponent({ src: initialSrc, alt }: MarkdownComponentProps) {
    let src = (initialSrc as string) || ""
    if (
      !hasExplicitUrlScheme(src) &&
      (src.startsWith("./") ||
        src.startsWith("../") ||
        (!src.startsWith("http") && !src.startsWith("/")))
    ) {
      const resolved = resolveRelativeArticlePath(
        rawPath,
        decodeImageSource(src)
      )
      src = `/api/assets?path=${encodeURIComponent(resolved)}`
    }
    return (
      <ArticleImage src={src} alt={getFallbackImageAlt(alt, src, rawPath)} />
    )
  }

  ImageComponent.displayName = "ImageComponent"

  return ImageComponent
}
