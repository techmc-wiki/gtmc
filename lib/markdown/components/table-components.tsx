import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function TableComponent({ ...props }: MarkdownComponentProps) {
  return (
    <div className="custom-bottom-scrollbar border-tech-main/30 bg-tech-bg/50 my-6 w-full overflow-x-auto border backdrop-blur-sm">
      <table
        className="w-full min-w-150 border-collapse text-left font-mono text-sm"
        {...props}
      />
    </div>
  )
}

export function TableHead({ ...props }: MarkdownComponentProps) {
  return (
    <thead
      className="border-tech-main/30 bg-tech-main/10 border-b"
      {...props}
    />
  )
}

export function TableHeaderCell({ ...props }: MarkdownComponentProps) {
  return (
    <th
      className="border-tech-main/10 text-tech-main border-r p-3 font-semibold whitespace-nowrap last:border-r-0"
      {...props}
    />
  )
}

export function TableDataCell({ ...props }: MarkdownComponentProps) {
  return (
    <td
      className="border-tech-main/10 border-t border-r p-3 text-slate-700 last:border-r-0"
      {...props}
    />
  )
}
