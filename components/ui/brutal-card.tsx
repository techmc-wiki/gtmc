import * as React from "react";

export interface BrutalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "white" | "electric-blue" | "neon-green" | "hot-pink" | "black" | "sun-yellow";
  pattern?: "none" | "dots" | "grid";
}

// 注意: 文件名保留了 brutal-card 以防止报错，但视觉重构为科研制图网格卡片
export const BrutalCard = React.forwardRef<HTMLDivElement, BrutalCardProps>(
  ({ className = "", children, ...props }, ref) => {
    // 技术扁平图纸感：细边框，无圆角，纯色几何；响应式内边距
    const baseStyles =
      "relative border border-tech-main bg-white/80 backdrop-blur-sm p-4 sm:p-6 transition-colors duration-300 hover:bg-tech-accent/10 text-tech-main";

    return (
      <div ref={ref} className={`${baseStyles} ${className} group`} {...props}>
        {/* 卡片的十字定位角标 */}
        <div className="border-tech-main/40 pointer-events-none absolute top-0 left-0 h-2 w-2 -translate-x-[1px] -translate-y-[1px] border-t-2 border-l-2"></div>
        <div className="border-tech-main/40 pointer-events-none absolute top-0 right-0 h-2 w-2 translate-x-[1px] -translate-y-[1px] border-t-2 border-r-2"></div>
        <div className="border-tech-main/40 pointer-events-none absolute bottom-0 left-0 h-2 w-2 -translate-x-[1px] translate-y-[1px] border-b-2 border-l-2"></div>
        <div className="border-tech-main/40 pointer-events-none absolute right-0 bottom-0 h-2 w-2 translate-x-[1px] translate-y-[1px] border-r-2 border-b-2"></div>

        {children}
      </div>
    );
  },
);
BrutalCard.displayName = "BrutalCard";
