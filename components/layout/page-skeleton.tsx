import type { ReactNode } from "react"
import { SkeletonExitWrapper } from "@/components/ui/loading-shell-primitives"

type PageSkeletonProps = {
  label: string
  children: ReactNode
  framed?: boolean
}

export function PageSkeleton({
  label,
  children,
  framed = false,
}: PageSkeletonProps) {
  return (
    <SkeletonExitWrapper>
      <div
        className={
          framed
            ? "border-tech-main/40 relative min-h-screen w-full border bg-transparent p-6 pb-32 backdrop-blur-sm sm:p-8"
            : "page-container"
        }
        aria-busy="true"
        aria-live="polite"
        aria-label={label}>
        <span className="sr-only">{label}</span>
        {framed ? <div aria-hidden="true">{children}</div> : children}
      </div>
    </SkeletonExitWrapper>
  )
}
