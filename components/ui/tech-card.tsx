import * as React from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"

export interface TechCardProps extends React.HTMLAttributes<HTMLDivElement> {
  color?:
    | "white"
    | "electric-blue"
    | "neon-green"
    | "hot-pink"
    | "black"
    | "sun-yellow"
  pattern?: "none" | "dots" | "grid"
}

export const TechCard = React.forwardRef<HTMLDivElement, TechCardProps>(
  ({ className = "", children, ...props }, ref) => {
    // 技术扁平图纸感：细边框，无圆角，纯色几何；响应式内边距
    const baseStyles =
      "relative border border-tech-main bg-white/80 backdrop-blur-sm p-4 sm:p-6 transition-colors duration-300 hover:bg-tech-accent/10 text-tech-main"

    return (
      <div
        ref={ref}
        className={`
          ${baseStyles}
          ${className}
          group
        `}
        {...props}>
        {/* 卡片的十字定位角标 */}
        <CornerBrackets />

        {children}
      </div>
    )
  }
)
TechCard.displayName = "TechCard"
