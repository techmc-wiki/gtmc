import React from "react"

interface CornerBracketsProps {
  variant?: "static" | "hover"
  color?: string
}

export function CornerBrackets({
  variant = "static",
  color = "border-tech-main/40",
}: CornerBracketsProps) {
  if (variant === "hover") {
    return (
      <>
        <div
          className={`
            absolute top-0 left-0 size-2 -translate-px border-t-2 border-l-2
            ${color}
            opacity-0 transition-opacity
            group-hover:opacity-100
          `}
        />
        <div
          className={`
            absolute right-0 bottom-0 size-2 translate-px border-r-2 border-b-2
            ${color}
            opacity-0 transition-opacity
            group-hover:opacity-100
          `}
        />
      </>
    )
  }

  return (
    <>
      <div
        className={`
          pointer-events-none absolute top-0 left-0 size-2 -translate-px
          border-t-2 border-l-2
          ${color}
        `}
      />
      <div
        className={`
          pointer-events-none absolute top-0 right-0 size-2 translate-x-px
          -translate-y-px border-t-2 border-r-2
          ${color}
        `}
      />
      <div
        className={`
          pointer-events-none absolute bottom-0 left-0 size-2 -translate-x-px
          translate-y-px border-b-2 border-l-2
          ${color}
        `}
      />
      <div
        className={`
          pointer-events-none absolute right-0 bottom-0 size-2 translate-px
          border-r-2 border-b-2
          ${color}
        `}
      />
    </>
  )
}
