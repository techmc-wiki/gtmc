import path from "path"
import { LazyImage } from "@/components/lazy-image"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"
import { hasExplicitUrlScheme } from "./url-utils"

export function createImageComponent(rawPath: string) {
  function ImageComponent({ src: initialSrc, alt }: MarkdownComponentProps) {
    let src = (initialSrc as string) || ""
    if (
      !hasExplicitUrlScheme(src) &&
      (src.startsWith("./") ||
       src.startsWith("../") ||
       (!src.startsWith("http") && !src.startsWith("/")))
    ) {
      const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "")
      const resolved = path.join(currentDir, src).replace(/\\/g, "/")
      src = `/api/assets?path=${encodeURIComponent(resolved)}`
    }
    return <LazyImage src={src} alt={(alt as string) || ""} />
  }

  ImageComponent.displayName = "ImageComponent"

  return ImageComponent
}
