import * as React from "react";

export interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

// 注意: 文件名保留了 brutal-button 以防止到处修改引用，但视觉已完全重构为"科研网格/技术图纸"风格
export const BrutalButton = React.forwardRef<
  HTMLButtonElement,
  BrutalButtonProps
>(({ className = "", variant = "primary", size = "md", ...props }, ref) => {
  let baseStyles =
    "relative inline-flex items-center justify-center font-bold tracking-widest transition-all duration-300 focus:outline-none overflow-hidden group border border-tech-main";

  // Tech Flat style based on image reference
  if (variant === "primary") {
    baseStyles += " bg-tech-main text-white hover:bg-tech-main-dark";
  } else if (variant === "secondary") {
    baseStyles += " bg-transparent text-tech-main hover:bg-tech-accent/20";
  } else if (variant === "danger") {
    baseStyles += " bg-[#8a5a68] text-white hover:bg-[#6c4852]"; // muted red
  } else if (variant === "ghost") {
    baseStyles +=
      " bg-transparent border-transparent text-tech-main hover:underline decoration-1 underline-offset-4";
  }

  // Sizes
  if (size === "sm") baseStyles += " px-4 py-1.5 text-xs text-sm";
  else if (size === "md") baseStyles += " px-6 py-2 text-sm";
  else if (size === "lg") baseStyles += " px-8 py-3 text-base";

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${className} flex items-center justify-center`} // 强制确保 button 是 flex 且居中
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {props.children}
      </span>

      {/* 装饰性的小方块点缀 */}
      {variant !== "ghost" && (
        <span className="absolute bottom-0 right-0 w-2 h-2 bg-tech-background opacity-50 border-t border-l border-tech-main mix-blend-overlay"></span>
      )}
    </button>
  );
});
BrutalButton.displayName = "BrutalButton";
