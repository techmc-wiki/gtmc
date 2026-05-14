import * as React from "react"

export interface TextAreaBoxProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const TextAreaBox = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaBoxProps
>(({ className = "", error, ...props }, ref) => {
  let baseStyles =
    "w-full resize-y border border-tech-main/30 px-3 py-2.5 sm:px-4 sm:py-3 font-mono outline-none transition-colors focus:border-tech-main bg-white/50 text-tech-main-dark min-h-[88px]"

  if (error) {
    baseStyles += " border-red-500 focus:border-red-500 text-red-600"
  }

  return (
    <textarea ref={ref} className={` ${baseStyles} ${className} `} {...props} />
  )
})
TextAreaBox.displayName = "TextAreaBox"
