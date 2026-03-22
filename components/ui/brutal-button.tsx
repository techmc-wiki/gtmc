import * as React from "react"

export interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
}

// 注意: 文件名保留了 brutal-button 以防止到处修改引用，但视觉已完全重构为"科研网格/技术图纸"风格
export const BrutalButton = React.forwardRef<
  HTMLButtonElement,
  BrutalButtonProps
>(
  (
    { className = "", variant = "primary", size = "md", ...props },
    ref,
  ) => {
    let baseStyles =
      "relative inline-flex items-center justify-center font-bold tracking-widest transition-all duration-300 focus:outline-none overflow-hidden group border border-tech-main cursor-pointer"

    // Tech Flat style based on image reference
    if (variant === "primary") {
      baseStyles += " bg-tech-main text-white hover:bg-tech-main-dark"
    } else if (variant === "secondary") {
      baseStyles +=
        " bg-transparent text-tech-main hover:bg-tech-accent/20"
    } else if (variant === "danger") {
      baseStyles += " bg-[#8a5a68] text-white hover:bg-[#6c4852]" // muted red
    } else if (variant === "ghost") {
      baseStyles +=
        " bg-transparent border-transparent text-tech-main hover:underline decoration-1 underline-offset-4"
    }

    // Sizes: responsive touch targets (min 44px on mobile)
    if (size === "sm")
      baseStyles += " px-3 py-2 sm:px-4 sm:py-1.5 text-xs sm:text-sm"
    else if (size === "md")
      baseStyles +=
        " px-4 py-2.5 sm:px-6 sm:py-2 text-sm min-h-[44px] sm:min-h-auto"
    else if (size === "lg")
      baseStyles +=
        " px-6 py-3 sm:px-8 sm:py-3 text-base min-h-[44px] sm:min-h-auto"

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${className} flex items-center justify-center`} // 强制确保 button 是 flex 且居中
        {...props}>
        <span className="relative z-10 flex items-center justify-center gap-2">
          {props.children}
        </span>

        {/* 装饰性的小方块点缀 */}
        {variant !== "ghost" && (
          <span className="bg-tech-bg border-tech-main absolute right-0 bottom-0 h-2 w-2 border-t border-l opacity-50 mix-blend-overlay"></span>
        )}
      </button>
    )
  },
)
BrutalButton.displayName = "BrutalButton"
