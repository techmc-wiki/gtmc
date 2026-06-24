import { Link } from "@/i18n/navigation"
import { LogoMark } from "@/components/ui/logo-mark"

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
  sm: "size-3.5",
  md: "size-5",
  lg: "size-7",
  xl: "size-8 md:size-10",
  "2xl": "size-10 md:size-12",
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
      {showSlash && <LogoMark className={`shrink-0 ${markClasses[size]}`} />}
      <span className="display-title text-tech-main-dark tracking-tight">
        GTMC
      </span>
    </Link>
  )
}
