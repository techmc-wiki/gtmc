import * as React from "react";

export interface BrutalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "white" | "electric-blue" | "neon-green" | "hot-pink" | "black" | "sun-yellow";
  pattern?: "none" | "dots" | "grid";
}

// 注意: 文件名保留了 brutal-card 以防止报错，但视觉重构为科研制图网格卡片
export const BrutalCard = React.forwardRef<HTMLDivElement, BrutalCardProps>(
  ({ className = "", color, pattern, children, ...props }, ref) => {
    // 技术扁平图纸感：细边框，无圆角，纯色几何；响应式内边距
    const baseStyles =
      "relative border border-tech-main bg-white/80 backdrop-blur-sm p-4 sm:p-6 transition-colors duration-300 hover:bg-tech-accent/10 text-tech-main";

    return (
      <div ref={ref} className={`${baseStyles} ${className} group`} {...props}>
        {/* 卡片的十字定位角标 */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tech-main -translate-x-[1px] -translate-y-[1px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-tech-main translate-x-[1px] -translate-y-[1px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-tech-main -translate-x-[1px] translate-y-[1px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tech-main translate-x-[1px] translate-y-[1px] pointer-events-none"></div>

        {children}
      </div>
    );
  },
);
BrutalCard.displayName = "BrutalCard";
