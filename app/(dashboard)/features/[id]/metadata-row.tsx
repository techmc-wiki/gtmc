import { cn } from "@/lib/cn"

interface MetadataRowProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function MetadataRow({ label, value, className }: MetadataRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center",
        className
      )}>
      <span className="mono-label font-bold text-zinc-500 sm:w-24">
        {label}
      </span>
      <span className="wrap-break-word">{value}</span>
    </div>
  )
}
