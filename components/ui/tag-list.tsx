import { cn } from "@/lib/cn"

interface TagListProps {
  tags: string[]
  className?: string
}

export function TagList({ tags, className }: TagListProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag: string) => (
        <span
          key={tag}
          className="guide-line bg-tech-main/5 text-tech-main/70 border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase">
          {tag}
        </span>
      ))}
    </div>
  )
}
