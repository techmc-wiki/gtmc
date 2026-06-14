import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function BlockquoteComponent({ ...props }: MarkdownComponentProps) {
  return (
    <blockquote
      className="border-tech-main bg-tech-main/5 text-tech-main my-6 border-l-2 p-4 font-sans italic [&_p:last-child]:mb-0"
      {...props}
    />
  )
}

export function HrComponent() {
  return (
    <div
      className="my-10 flex items-center justify-center gap-3"
      aria-hidden="true">
      <span className="bg-tech-main/25 h-px w-16" />
      <span className="text-tech-main/45 rotate-45">
        <span className="border-tech-main/45 block size-1.5 border" />
      </span>
      <span className="bg-tech-main/25 h-px w-16" />
    </div>
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
