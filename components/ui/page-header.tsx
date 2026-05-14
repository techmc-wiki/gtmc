import * as React from "react"

interface PageHeaderProps {
  title: string
  subtitle: string
  action?: React.ReactNode
  topMargin?: boolean
}

export function PageHeader({
  title,
  subtitle,
  action,
  topMargin = false,
}: PageHeaderProps) {
  return (
    <div
      className={`border-tech-main/40 relative border-b pb-6 ${
        action
          ? `flex flex-col items-start justify-between gap-4 md:flex-row md:items-end`
          : ``
      } ${topMargin ? `mt-8` : ``} `}>
      <div className="guide-line absolute top-0 right-0 size-8 translate-x-px -translate-y-px border-t border-r" />
      <div className={action ? `mb-0 w-full md:w-auto` : ``}>
        <h1 className="text-tech-main-dark flex items-center gap-2 text-2xl font-bold tracking-tight uppercase md:text-4xl">
          <span className="border-tech-main/40 bg-tech-main/20 size-3 shrink-0 border" />
          <span className="wrap-break-word">{title}</span>
        </h1>
        <p className="text-tech-main/80 mt-3 flex items-center gap-2 font-mono text-xs tracking-widest sm:text-sm">
          <span className="bg-tech-main size-1.5 shrink-0 animate-pulse rounded-full" />
          <span className="wrap-break-word">{subtitle}</span>
        </p>
      </div>
      {action && <div className="w-full md:w-auto">{action}</div>}
    </div>
  )
}
