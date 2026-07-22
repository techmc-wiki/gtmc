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
    return <ArticleImage src={src} alt={(alt as string) || ""} />
  }

  ImageComponent.displayName = "ImageComponent"

  return ImageComponent
}
