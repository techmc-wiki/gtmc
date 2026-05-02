"use client"

import * as React from "react"

import { cn } from "@/lib/cn"

export type SegmentedControlRole = "group" | "radiogroup" | "tablist"
export type SegmentedControlSize = "sm" | "md"

export interface SegmentedControlOption<TValue extends string> {
  value: TValue
  label: React.ReactNode
  disabled?: boolean
  ariaControls?: string
  ariaLabel?: string
}

export interface SegmentedControlProps<TValue extends string> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  options: readonly SegmentedControlOption<TValue>[]
  value: TValue
  onValueChange: (value: TValue) => void
  ariaLabel?: string
  ariaLabelledBy?: string
  controlRole?: SegmentedControlRole
  size?: SegmentedControlSize
}

const sizeClasses = {
  sm: "min-h-8 px-3 py-2 text-xs",
  md: "min-h-10 px-4 py-2.5 text-sm",
} as const satisfies Record<SegmentedControlSize, string>

export function SegmentedControl<TValue extends string>({
  options,
  value,
  onValueChange,
  ariaLabel,
  ariaLabelledBy,
  controlRole = "group",
  size = "sm",
  className,
  ...props
}: SegmentedControlProps<TValue>) {
  const enabledOptions = options.filter((option) => !option.disabled)

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    option: SegmentedControlOption<TValue>,
    index: number
  ) => {
    if (option.disabled) {
      return
    }

    const direction = getKeyboardDirection(event.key)
    if (direction === 0 || enabledOptions.length === 0) {
      return
    }

    event.preventDefault()

    const enabledIndex = enabledOptions.findIndex(
      (enabledOption) => enabledOption.value === option.value
    )
    const currentIndex = enabledIndex >= 0 ? enabledIndex : index
    const nextOption = enabledOptions.at(
      (currentIndex + direction + enabledOptions.length) % enabledOptions.length
    )

    if (nextOption) {
      onValueChange(nextOption.value)
    }
  }

  return (
    <div
      role={controlRole}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn("flex flex-wrap gap-2", className)}
      {...props}>
      {options.map((option, index) => {
        const isSelected = value === option.value
        const itemRole = getItemRole(controlRole)

        return (
          <button
            key={option.value}
            type="button"
            role={itemRole}
            aria-label={option.ariaLabel}
            aria-selected={controlRole === "tablist" ? isSelected : undefined}
            aria-checked={controlRole === "radiogroup" ? isSelected : undefined}
            aria-pressed={controlRole === "group" ? isSelected : undefined}
            aria-controls={
              controlRole === "tablist" ? option.ariaControls : undefined
            }
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, option, index)}
            className={cn(
              `
                flex cursor-pointer items-center justify-center border font-mono
                tracking-widest uppercase transition-all duration-200 select-none
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-tech-main
              `,
              sizeClasses[size],
              isSelected
                ? "border-tech-main bg-tech-main font-bold text-white"
                : `
                  border-tech-main/40 bg-tech-main/5 text-tech-main
                  hover:border-tech-main/60 hover:bg-tech-main/10
                `,
              option.disabled && "cursor-not-allowed opacity-50"
            )}>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function getItemRole(controlRole: SegmentedControlRole) {
  if (controlRole === "tablist") {
    return "tab"
  }

  if (controlRole === "radiogroup") {
    return "radio"
  }

  return undefined
}

function getKeyboardDirection(key: string) {
  if (key === "ArrowRight" || key === "ArrowDown") {
    return 1
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    return -1
  }

  return 0
}
