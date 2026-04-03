import { cn } from "@/lib/cn"

interface StatusDotProps {
  size?: "sm" | "md"
  variant?: "main" | "accent"
  className?: string
}

export function StatusDot({
  size = "md",
  variant = "main",
  className,
}: StatusDotProps) {
  const sizeClasses = {
    sm: "size-1.5",
    md: "size-2",
  }

  const variantClasses = {
    main: {
      sm: "animate-pulse bg-tech-main/40",
      md: "animate-pulse bg-tech-main/50",
    },
    accent: {
      sm: "inline-block animate-pulse bg-tech-accent",
      md: "inline-block animate-pulse bg-tech-accent",
    },
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        variantClasses[variant][size],
        className
      )}
    />
  )
}
