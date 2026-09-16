"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface ArticleImageProps {
  src: string
  alt: string
}

export function ArticleImage({ src, alt }: ArticleImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  )

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

      <div className="t-skel-content">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className="border-tech-main/30 bg-tech-main/5 border object-contain p-1 shadow-sm"
          unoptimized={src.includes("/api/assets")}
        />
      </div>
    </div>
  )
}
