import * as React from "react";

export interface BrutalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const BrutalInput = React.forwardRef<HTMLInputElement, BrutalInputProps>(
  ({ className = "", error, ...props }, ref) => {
    let baseStyles =
      "w-full border border-tech-main/30 px-4 py-3 font-mono outline-none transition-colors focus:border-tech-main bg-white/50 text-tech-main-dark";

    if (error) {
      baseStyles += " border-red-500 focus:border-red-500 text-red-600";
    }

    return (
      <input ref={ref} className={`${baseStyles} ${className}`} {...props} />
    );
  },
);
BrutalInput.displayName = "BrutalInput";
