import * as React from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { cn } from "@/lib/cn"

export function SectionFrame({
  className,
  showBrackets = true,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  showBrackets?: boolean
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={cn(
        "border-tech-main/40 bg-surface-overlay/80 relative border p-6 backdrop-blur-sm sm:p-8",
        className
      )}
      {...props}>
      {showBrackets && (
        <CornerBrackets size="size-2" color="border-tech-main/60" />
      )}
      {children}
    </div>
  )
}

export function SectionRail({
  label,
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  label: string
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={cn(
        "tracking-tech-wide text-tech-main font-mono text-xs uppercase",
        className
      )}
      {...props}>
      {label}_
    </div>
  )
}

export function SegmentedBar({
  opacity = "medium",
  showBorder = false,
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  opacity?: "high" | "medium" | "low"
  showBorder?: boolean
  ref?: React.Ref<HTMLDivElement>
}) {
  const opacityMap = {
    high: "bg-tech-accent/20",
    medium: "bg-tech-accent/15",
    low: "bg-tech-accent/10",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "h-2",
        opacityMap[opacity],
        showBorder && "border-tech-line border",
        className
      )}
      {...props}
    />
  )
}

export function SkeletonExitWrapper({
  isExiting = false,
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  isExiting?: boolean
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={cn(
        isExiting && "animate-skeleton-exit motion-reduce:animate-fade-out",
        className
      )}
      {...props}
    />
  )
}

export function SweepOverlay({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={cn(
        "animate-blueprint-sweep via-tech-accent/30 absolute inset-0 bg-linear-to-r from-transparent to-transparent motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export function ScanConfirmOverlay({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={cn(
        "animate-scan-confirm via-tech-accent/30 absolute inset-0 bg-linear-to-r from-transparent to-transparent motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}
