import Image from "next/image"
import { cn } from "@/lib/cn"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface UserAvatarProps {
  src?: string | null
  alt?: string | null
  fallback?: string
  className?: string
  sizes?: string
  loading?: "eager" | "lazy"
}

export function UserAvatar({
  src,
  alt,
  fallback,
  className,
  sizes = "(max-width: 768px) 32px, 40px",
  loading = "lazy",
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        "relative box-border flex aspect-square size-full items-center justify-center overflow-hidden border-2 border-tech-main/60 bg-tech-main/10 p-1 ring-1 ring-tech-main/20",
        className
      )}>
      <CornerBrackets
        className="pointer-events-none absolute inset-0 z-10"
        size="size-2"
        color="border-tech-main/70"
      />
      {src ? (
        <Image
          src={src}
          alt={alt || "Avatar"}
          fill
          sizes={sizes}
          loading={loading}
          className="object-cover"
        />
      ) : (
        <span className="text-tech-main/50 font-mono text-xl font-bold tracking-widest uppercase">
          {(fallback || alt || "?")[0]}
        </span>
      )}
    </div>
  )
}
