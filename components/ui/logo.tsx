import { Link } from "@/i18n/navigation"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
  showSlash?: boolean
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
  "2xl": "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
} as const

const markClasses = {
  sm: "size-3.5 text-[0.5rem]",
  md: "size-5 text-[0.625rem]",
  lg: "size-7 text-sm",
  xl: "size-8 text-base md:size-10 md:text-lg",
  "2xl": "size-10 text-lg md:size-12 md:text-xl",
} as const

export function Logo({
  className = "",
  size = "md",
  showSlash = true,
}: LogoProps) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 transition-opacity hover:opacity-80 ${sizeClasses[size]} ${className} `}>
      {showSlash && (
        <span
          aria-hidden="true"
          className={`bg-tech-signal text-tech-signal-ink flex shrink-0 items-center justify-center font-mono font-bold ${markClasses[size]} `}>
          G
        </span>
      )}
      <span className="display-title text-tech-main-dark tracking-tight">
        GTMC
      </span>
    </Link>
  )
}
