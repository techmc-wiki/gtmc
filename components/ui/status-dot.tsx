import { cn } from "@/lib/cn"

type StatusDotVariant =
  | "main"
  | "accent"
  | "clean"
  | "conflict"
  | "resolved"
  | "completed"
  | "in-progress"

interface StatusDotProps {
  size?: "sm" | "md"
  variant?: StatusDotVariant
  className?: string
}

const sizeClasses = {
  sm: "size-1.5",
  md: "size-2",
} as const

const variantClasses: Record<StatusDotVariant, Record<"sm" | "md", string>> = {
  main: {
    sm: "animate-pulse bg-tech-main/40",
    md: "animate-pulse bg-tech-main/50",
  },
  accent: {
    sm: "animate-pulse bg-tech-accent",
    md: "animate-pulse bg-tech-accent",
  },
  clean: {
    sm: "bg-tech-main/20",
    md: "bg-tech-main/20",
  },
  conflict: {
    sm: "bg-red-500",
    md: "bg-red-500",
  },
  resolved: {
    sm: "bg-green-500",
    md: "bg-green-500",
  },
  completed: {
    sm: "bg-green-500",
    md: "bg-green-500",
  },
  "in-progress": {
    sm: "animate-pulse bg-yellow-400",
    md: "animate-pulse bg-yellow-400",
  },
}

export function StatusDot({
  size = "md",
  variant = "main",
  className,
}: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0",
        sizeClasses[size],
        variantClasses[variant][size],
        className
      )}
    />
  )
}
