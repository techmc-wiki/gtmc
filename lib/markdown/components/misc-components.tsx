import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function BlockquoteComponent({ ...props }: MarkdownComponentProps) {
  return (
    <blockquote
      className="border-tech-main bg-tech-main/5 text-tech-main mb-6 border-l-2 p-4 pb-[0.01] font-sans italic"
      {...props}
    />
  )
}

export function HrComponent({ ...props }: MarkdownComponentProps) {
  return (
    <hr
      className="border-tech-main/30 mx-auto my-8 w-4/5 border-t"
      {...props}
    />
  )
}

export function SupComponent({ ...props }: MarkdownComponentProps) {
  return (
    <sup
      className="before:text-tech-main/60 after:text-tech-main/60 mx-0.5 cursor-pointer font-mono not-italic before:content-['{'] after:content-['}']"
      {...props}
    />
  )
}
