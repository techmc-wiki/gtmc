import * as React from "react"

export interface TechButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
}

export const TechButton = React.forwardRef<HTMLButtonElement, TechButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    let baseStyles =
      "relative inline-flex items-center justify-center font-bold tracking-widest transition-all duration-300 focus:outline-none focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2 overflow-hidden group border cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"

    if (variant === "primary") {
      baseStyles +=
        " bg-tech-main-dark border-tech-main-dark text-tech-bg hover:bg-tech-signal hover:border-tech-signal hover:text-tech-signal-ink"
    } else if (variant === "secondary") {
      baseStyles +=
        " bg-surface-overlay/80 border-tech-main text-tech-main hover:border-tech-main-dark hover:text-tech-main-dark hover:bg-tech-accent/20"
    } else if (variant === "danger") {
      baseStyles += " bg-red-500 border-red-500 text-white hover:bg-red-700"
    } else if (variant === "ghost") {
      baseStyles +=
        " bg-transparent border-transparent text-tech-main hover:underline decoration-1 underline-offset-4"
    }

    // Sizes: responsive touch targets (min 44px on mobile)
    if (size === "sm") {
      baseStyles += " px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
    } else if (size === "md") {
      baseStyles +=
        " px-4 py-2.5 sm:px-6 sm:py-3 text-sm min-h-[44px] sm:min-h-auto"
    } else if (size === "lg") {
      baseStyles +=
        " px-6 py-3 sm:px-8 sm:py-4 text-base min-h-[44px] sm:min-h-auto"
    }

    return (
      <button
        ref={ref}
        className={` ${baseStyles} ${className} flex items-center justify-center`} // 强制确保 button 是 flex 且居中
        {...props}>
        <span className="relative z-10 flex items-center justify-center gap-2">
          {props.children}
        </span>

        {variant !== "ghost" && (
          <span className="bg-tech-signal absolute right-0 bottom-0 size-1.5 opacity-80 transition-colors duration-300 group-hover:bg-current"></span>
        )}
      </button>
    )
  }
)
TechButton.displayName = "TechButton"
