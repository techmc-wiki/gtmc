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
      className={`border-tech-main-dark relative border-b-2 pb-6 ${
        action
          ? `flex flex-col items-start justify-between gap-4 md:flex-row md:items-end`
          : ``
      } ${topMargin ? `mt-8` : ``} `}>
      <div className="bg-tech-signal absolute -bottom-0.5 left-0 h-0.5 w-16" />
      <div className={action ? `mb-0 w-full md:w-auto` : ``}>
        <p className="text-tech-main/60 mb-2 font-mono text-[0.625rem] tracking-[0.25em] uppercase">
          {subtitle}
        </p>
        <h1 className="display-title text-tech-main-dark text-3xl tracking-tight text-balance md:text-5xl">
          {title}
        </h1>
      </div>
      {action && <div className="w-full md:w-auto">{action}</div>}
    </div>
  )
}
