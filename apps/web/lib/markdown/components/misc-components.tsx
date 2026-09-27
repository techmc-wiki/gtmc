import type {
  MarkdownComponent,
  MarkdownComponentProps,
} from "@/lib/markdown/component-types"

export function makeSpan(style: Record<string, string>): MarkdownComponent {
  function SpanComponent({ node: _node, ...props }: MarkdownComponentProps) {
    return <span style={style} {...props} />
  }
  SpanComponent.displayName = "makeSpan"
  return SpanComponent
}

export function UnorderedListComponent({ ...props }: MarkdownComponentProps) {
  return (
    <ul
      className="border-tech-main/30 text-tech-main-dark mb-6 list-disc space-y-1.5 border-l pl-8 font-sans text-base/relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
      {...props}
    />
  )
}

export function OrderedListComponent({ ...props }: MarkdownComponentProps) {
  return (
    <ol
      className="text-tech-main-dark mb-6 list-decimal space-y-1.5 pl-8 font-sans text-base/relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
      {...props}
    />
  )
}

export function SectionComponent({
  id,
  children,
  ...props
}: MarkdownComponentProps) {
  // Wrap footnote sections in <aside> for semantic HTML
  if (id === "footnotes") {
    return (
      <aside
        className="border-tech-main/30 text-tech-main mt-12 border-t pt-6 font-sans text-sm"
        {...props}>
        <section id={id} {...props}>
          {children}
        </section>
      </aside>
    )
  }

  return (
    <section id={id} {...props}>
      {children}
    </section>
  )
}

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
