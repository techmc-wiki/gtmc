"use client"

import * as React from "react"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { cn } from "@/lib/cn"

export interface SelectableCardProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "title"
> {
  title: React.ReactNode
  subtitle?: React.ReactNode
  detail?: React.ReactNode
  selected?: boolean
  badge?: React.ReactNode
  recommended?: boolean
  recommendedLabel?: React.ReactNode
  selectedLabel?: React.ReactNode
}

export const SelectableCard = React.forwardRef<
  HTMLButtonElement,
  SelectableCardProps
>(
  (
    {
      title,
      subtitle,
      detail,
      selected = false,
      badge,
      recommended = false,
      recommendedLabel = "RECOMMENDED",
      selectedLabel = "SELECTED",
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const visibleBadge = badge ?? (recommended ? recommendedLabel : null)

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        className={cn(
          `group focus-visible:outline-tech-main relative border p-4 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-5`,
          selected
            ? "border-tech-main bg-tech-main/10"
            : "guide-line hover:border-tech-main/50 bg-white/70 hover:bg-white/90",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          className
        )}
        {...props}>
        <CornerBrackets
          color={selected ? "border-tech-main/60" : "border-tech-main/30"}
        />

        {visibleBadge ? (
          <span
            className={cn(
              `border-tech-main bg-tech-main mb-3 inline-block border px-3 py-1 font-mono text-[0.6875rem] font-bold tracking-widest text-white uppercase`,
              disabled && "opacity-70"
            )}>
            {visibleBadge}
          </span>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "font-mono text-sm font-bold tracking-widest uppercase",
                selected ? "text-tech-main" : "text-tech-main/80"
              )}>
              {title}
            </p>

            {subtitle ? (
              <p className="text-tech-main/60 mt-1.5 font-mono text-xs/relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>

          {selected ? (
            <span
              aria-hidden="true"
              className="bg-tech-main mt-1 inline-block size-1.5 shrink-0"
            />
          ) : null}
        </div>

        {detail ? (
          <p className="text-tech-main/40 mt-2 font-mono text-[0.6875rem] leading-relaxed">
            {detail}
          </p>
        ) : null}

        {children ? <div className="mt-3">{children}</div> : null}

        {selected ? (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="bg-tech-main inline-block size-1.5"
            />
            <span className="text-tech-main font-mono text-[0.6875rem] tracking-widest uppercase">
              {selectedLabel}
            </span>
          </div>
        ) : null}
      </button>
    )
  }
)

SelectableCard.displayName = "SelectableCard"
