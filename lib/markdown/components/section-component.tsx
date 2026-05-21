import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function SectionComponent({
  id,
  children,
  ...props
}: MarkdownComponentProps) {
  // Wrap footnote sections in <aside> for semantic HTML
  if (id === "footnotes") {
    return (
      <aside
        className="border-tech-main/30 mt-12 border-t pt-6 font-sans text-sm text-slate-700"
        {...props}>
        <section id={id} {...props}>
          {children}
        </section>
      </aside>
    )
  }

  // Regular sections render normally
  return (
    <section id={id} {...props}>
      {children}
    </section>
  )
}
