import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function UnorderedListComponent({ ...props }: MarkdownComponentProps) {
  return (
    <ul
      className="border-tech-main/30 mb-6 list-disc space-y-2 border-l pl-8 font-sans text-slate-800"
      {...props}
    />
  )
}

export function OrderedListComponent({ ...props }: MarkdownComponentProps) {
  return (
    <ol
      className="mb-6 list-decimal space-y-2 pl-8 font-sans text-slate-800"
      {...props}
    />
  )
}
