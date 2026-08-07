import * as React from "react"
import { cn } from "@/lib/cn"

const fieldBoxClasses =
  "w-full border border-tech-main/30 px-3 py-2.5 sm:px-4 sm:py-3 font-mono outline-none transition-colors focus:border-tech-main bg-surface-input/50 text-tech-main-dark"
const fieldBoxErrorClasses = "border-red-500 focus:border-red-500 text-red-600"
const inputBoxSizeClasses = "min-h-[44px] sm:min-h-auto"
const textAreaBoxSizeClasses = "resize-y min-h-[88px]"

interface FieldBoxBaseProps {
  /** Red border + red text when the field fails validation. */
  error?: boolean
  className?: string
}

export type FieldBoxProps = FieldBoxBaseProps &
  (
    | (Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "className" | "ref"
      > & {
        multiline?: false
      })
    | (Omit<
        React.TextareaHTMLAttributes<HTMLTextAreaElement>,
        "className" | "ref"
      > & {
        multiline: true
      })
  )

/**
 * Unified text field: a bordered mono `<input>` by default, `<textarea>` when
 * `multiline` — same square geometry, focus border, and error treatment.
 */
export function FieldBox({
  error,
  multiline = false,
  className = "",
  ref,
  ...props
}: FieldBoxProps & {
  ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement>
}) {
  const classes = cn(
    fieldBoxClasses,
    error && fieldBoxErrorClasses,
    multiline ? textAreaBoxSizeClasses : inputBoxSizeClasses,
    className
  )

  if (multiline) {
    return (
      <textarea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        className={classes}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    )
  }

  return (
    <input
      ref={ref as React.Ref<HTMLInputElement>}
      className={classes}
      {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  )
}
