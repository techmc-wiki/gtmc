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
          className="
            border guide-line bg-tech-main/5 px-1.5 py-0.5
            font-mono text-[10px] text-tech-main/70 uppercase
          ">
          {tag}
        </span>
      ))}
    </div>
  )
}
