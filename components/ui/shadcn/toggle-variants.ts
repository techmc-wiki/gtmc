import { cva } from "class-variance-authority"

export const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-none border font-mono text-xs tracking-wider uppercase whitespace-nowrap transition-colors duration-200 outline-none select-none cursor-pointer focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-transparent text-tech-main hover:bg-tech-main/10 hover:text-tech-main-dark",
        outline:
          "border-tech-main/40 bg-tech-main/5 text-tech-main hover:border-tech-main/60 hover:bg-tech-main/10",
        tech: "border-tech-main/40 bg-tech-main/5 text-tech-main hover:border-tech-main/60 hover:bg-tech-main/10 data-[state=on]:border-tech-main-dark data-[state=on]:bg-tech-main-dark data-[state=on]:font-bold data-[state=on]:text-tech-bg",
      },
      size: {
        default: "h-9 min-w-9 px-3 text-sm",
        sm: "h-8 min-w-8 px-3 text-xs",
        lg: "h-10 min-w-10 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
