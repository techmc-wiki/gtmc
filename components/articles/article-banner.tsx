"use client"

import Image from "next/image"
import { useState } from "react"

interface ArticleBannerProps {
  src: string
  alt: string
}

export function ArticleBanner({ src, alt }: ArticleBannerProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")

  return (
    <figure className="border-tech-main/40 bg-surface-overlay/60 mb-8 border">
      {status !== "error" && (
        <div
          className={`t-skel relative aspect-21/9 w-full overflow-hidden ${status === "loaded" ? "is-revealed" : ""}`}
          aria-busy={status === "loading"}>
          <div className="t-skel-skeleton is-pulsing pointer-events-none" aria-hidden="true">
            <div className="bg-tech-accent/20 size-full" />
          </div>
          <div className="t-skel-content size-full">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
              className="object-cover"
              priority
              unoptimized={src.startsWith("/article-assets/")}
              onLoad={() => setStatus("loaded")}
              onError={() => setStatus("error")}
            />
          </div>
        </div>
      )}
      <figcaption className="border-tech-main/30 text-tech-main/80 border-t px-3 py-2 text-sm">
        {alt}
      </figcaption>
    </figure>
  )
}
