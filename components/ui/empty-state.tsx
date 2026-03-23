import * as React from "react"

interface EmptyStateProps {
  message: string
  colSpanFull?: boolean
}

export function EmptyState({ message, colSpanFull = false }: EmptyStateProps) {
  return (
    <div
      className={`
        group relative border border-dashed border-tech-main/40 bg-white/30
        py-16 text-center backdrop-blur-sm
        ${colSpanFull ? `col-span-full` : ``}
      `}>
      <div
        className="
          absolute inset-0
          bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(96,112,143,0.05)_10px,rgba(96,112,143,0.05)_20px)]
        "
      />
      <h2
        className="
          relative z-10 font-mono text-lg tracking-widest text-tech-main/50
          uppercase
        ">
        {message}
      </h2>
    </div>
  )
}
