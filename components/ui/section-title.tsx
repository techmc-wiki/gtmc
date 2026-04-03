import { cn } from "@/lib/cn"

interface SectionTitleProps {
  children: React.ReactNode
  className?: string
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2
      className={cn(
        "mb-6 border-b guide-line pb-2 text-lg font-bold tracking-widest text-tech-main-dark uppercase md:text-xl",
        className
      )}>
      {children}
    </h2>
  )
}
