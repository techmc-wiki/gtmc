import path from "path"
import Image from "next/image"
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
      const resolved = path.join(currentDir, src).replaceAll("\\", "/")
      src = `/api/assets?path=${encodeURIComponent(resolved)}`
    }
    return (
      <div className="relative my-8 aspect-video max-w-full">
        <Image
          src={src}
          alt={(alt as string) || ""}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
          loading="eager"
          className="border-tech-main/30 bg-tech-main/5 border object-contain p-1 shadow-sm"
          unoptimized={src.includes("/api/assets")}
        />
      </div>
    )
  }

  ImageComponent.displayName = "ImageComponent"

  return ImageComponent
}
