import * as React from "react"
import { cn } from "@/lib/cn"

const fieldBoxClasses =
  "w-full border border-tech-main/30 bg-surface-input/50 px-3 py-2.5 font-mono text-tech-main-dark outline-none transition-colors focus:border-tech-main sm:px-4 sm:py-3"
const fieldBoxErrorClasses = "border-red-500 text-red-600 focus:border-red-500"
const inputBoxSizeClasses = "min-h-[44px]"
const textAreaBoxSizeClasses = "min-h-[88px] resize-y"

interface FieldBoxBaseProps {
  /** Red border + red text when the field fails validation. */
  error?: boolean
  className?: string
}

type InputBoxProps = FieldBoxBaseProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "ref"> & {
    multiline?: false
    ref?: React.Ref<HTMLInputElement>
  }

type TextAreaBoxProps = FieldBoxBaseProps &
  Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "className" | "ref"
  > & {
    multiline: true
    ref?: React.Ref<HTMLTextAreaElement>
  }

export type FieldBoxProps = InputBoxProps | TextAreaBoxProps

/**
 * Unified text field: a bordered mono `<input>` by default, `<textarea>` when
 * `multiline` — same square geometry, focus border, and error treatment.
 */
export function FieldBox(props: FieldBoxProps) {
  if (props.multiline) {
    const { error, className, ref, multiline: _, ...textAreaProps } = props
    return (
      <textarea
        ref={ref}
        className={cn(
          fieldBoxClasses,
          error && fieldBoxErrorClasses,
          textAreaBoxSizeClasses,
          className
        )}
        {...textAreaProps}
      />
    )
  }

  const { error, className, ref, multiline: _, ...inputProps } = props
  return (
    <input
      ref={ref}
      className={cn(
        fieldBoxClasses,
        error && fieldBoxErrorClasses,
        inputBoxSizeClasses,
        className
      )}
      {...inputProps}
    />
  )
}
