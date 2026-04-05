import Image from "next/image"

interface ArticleBannerProps {
  src: string
  alt: string
}

export function ArticleBanner({ src, alt }: ArticleBannerProps) {
  return (
    <div className="relative mb-8 animate-fade-in">
      {/* Outer frame */}
      <div className="relative border border-tech-main/40 bg-white/60">
        {/* Top bar — monospace label strip */}
        <div
          className="
            flex items-center justify-between border-b border-tech-main/30
            bg-tech-main/5 px-3 py-1.5 font-mono text-[10px]
            tracking-widest text-tech-main/50
          ">
          <span className="flex items-center gap-2">
            <span className="size-1.5 bg-tech-main/50" />
            IMG.BANNER
          </span>
          <span className="hidden sm:block">RES: AUTO | FMT: RASTER</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1 bg-tech-main/30" />
            <span className="size-1 bg-tech-main/50" />
            <span className="size-1 bg-tech-main/70" />
          </span>
        </div>

        {/* Image container */}
        <div className="group relative aspect-[21/9] w-full overflow-hidden">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
            className="
              object-cover saturate-[0.88] transition-all duration-700
              group-hover:saturate-100
            "
            priority
          />

          {/* Blueprint grid overlay */}
          <div
            className="
              pointer-events-none absolute inset-0
              opacity-[0.06]
            "
            style={{
              backgroundImage: `
                linear-gradient(to right, #60708f 1px, transparent 1px),
                linear-gradient(to bottom, #60708f 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Subtle vignette */}
          <div
            className="
              pointer-events-none absolute inset-0
              bg-gradient-to-t from-tech-main/20 via-transparent to-transparent
            "
          />

          {/* Corner brackets — top-left */}
          <div className="pointer-events-none absolute top-2 left-2 size-4 border-t-2 border-l-2 border-tech-main/60" />
          {/* Corner brackets — top-right */}
          <div className="pointer-events-none absolute top-2 right-2 size-4 border-t-2 border-r-2 border-tech-main/60" />
          {/* Corner brackets — bottom-left */}
          <div className="pointer-events-none absolute bottom-2 left-2 size-4 border-b-2 border-l-2 border-tech-main/60" />
          {/* Corner brackets — bottom-right */}
          <div className="pointer-events-none absolute right-2 bottom-2 size-4 border-r-2 border-b-2 border-tech-main/60" />

          {/* Center crosshair */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
            <div className="absolute top-1/2 left-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 bg-tech-main" />
            <div className="absolute top-1/2 left-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2 bg-tech-main" />
            <div className="size-3 rounded-full border border-tech-main" />
          </div>

          {/* Scan line — horizontal rule at 1/3 */}
          <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-tech-main/10" />
        </div>

        {/* Bottom bar — alt text as caption */}
        <div
          className="
            flex items-center gap-2 border-t border-tech-main/30
            bg-tech-main/5 px-3 py-1.5 font-mono text-[10px]
            tracking-wide text-tech-main/40
          ">
          <span className="shrink-0 text-tech-main/30">{"// "}</span>
          <span className="truncate italic">{alt}</span>
        </div>
      </div>

      {/* Outer corner accents */}
      <div className="pointer-events-none absolute -top-px -left-px size-2 border-t-2 border-l-2 border-tech-main/60" />
      <div className="pointer-events-none absolute -top-px -right-px size-2 border-t-2 border-r-2 border-tech-main/60" />
      <div className="pointer-events-none absolute -bottom-px -left-px size-2 border-b-2 border-l-2 border-tech-main/60" />
      <div className="pointer-events-none absolute -right-px -bottom-px size-2 border-r-2 border-b-2 border-tech-main/60" />
    </div>
  )
}
