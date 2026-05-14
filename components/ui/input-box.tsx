import * as React from "react"

export interface InputBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const InputBox = React.forwardRef<HTMLInputElement, InputBoxProps>(
  ({ className = "", error, ...props }, ref) => {
    let baseStyles =
      "w-full border border-tech-main/30 px-3 py-2.5 sm:px-4 sm:py-3 font-mono outline-none transition-colors focus:border-tech-main bg-white/50 text-tech-main-dark min-h-[44px] sm:min-h-auto"

    if (error) {
      baseStyles += " border-red-500 focus:border-red-500 text-red-600"
    }

    return (
      <input ref={ref} className={` ${baseStyles} ${className} `} {...props} />
    )
  }
)
InputBox.displayName = "InputBox"
