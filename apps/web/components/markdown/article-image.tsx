"use client"

import { useTranslations } from "next-intl"
import Image from "next/image"
import { useCallback, useState } from "react"

import { MediaViewer } from "@/components/markdown/media-viewer"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface ArticleImageProps {
  src: string
  alt: string
}

export function ArticleImage({ src, alt }: ArticleImageProps) {
  const t = useTranslations("CommonA11y")
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")

  const handleLoad = useCallback(() => {
    setStatus("loaded")
  }, [])

  const handleError = useCallback(() => {
    setStatus("error")
  }, [])

  const isRevealed = status === "loaded"

  return (
    <div
      data-state={status}
      className={`t-skel article-image-skel relative my-8 aspect-video max-w-full ${
        isRevealed ? "is-revealed" : ""
      }`}>
      <div
        className={`t-skel-skeleton border-tech-main/30 bg-tech-main/5 pointer-events-none absolute inset-0 z-10 flex flex-col border p-1 shadow-sm ${
          status === "loading" ? "is-pulsing" : ""
        }`}
        aria-hidden="true">
        <div className="bg-tech-accent/10 relative flex size-full flex-1 items-center justify-center overflow-hidden">
          <CornerBrackets size="size-2" color="border-tech-main/30" />

          <span className="text-tech-main/40 relative z-10 text-[0.5625rem] tracking-widest uppercase select-none">
            {status === "error" ? "// LOAD_FAIL" : "// IMG_LOAD"}
          </span>
        </div>
      </div>

      <MediaViewer
        title={alt}
        trigger={
          <button
            type="button"
            disabled={!isRevealed}
            aria-label={t("viewImage", { alt })}
            className="t-skel-content focus-visible:outline-tech-signal absolute inset-0 w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
              className="border-tech-main/30 bg-tech-main/5 border object-contain p-1 shadow-sm"
              unoptimized={src.includes("/api/assets") || src.startsWith("/api/draft-assets/")}
            />
          </button>
        }>
        <div className="relative h-[min(75vh,60rem)] w-full">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="96vw"
            className="object-contain"
            unoptimized={src.includes("/api/assets") || src.startsWith("/api/draft-assets/")}
          />
        </div>
      </MediaViewer>
    </div>
  )
}
