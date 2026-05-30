import { CodeBlockPre } from "@/components/markdown/code-block-pre"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function CodeComponent({
  className,
  children,
  node: _node,
  ...props
}: MarkdownComponentProps) {
  if (props["data-linked-code"] === "true") {
    const { "data-linked-code": _linkedCode, ...rest } = props
    return (
      <code
        className="border-tech-main/30 bg-tech-main/10 text-tech-main group-hover/lc:border-tech-main group-hover/lc:bg-tech-main/80 mx-1 border border-b-2 px-1 py-[0.05rem] font-mono text-[0.8em] not-italic transition-colors group-hover/lc:text-white"
        {...rest}>
        {children}
      </code>
    )
  }
  if (props["data-has-link"] === "true") {
    const { "data-has-link": _hasLink, ...rest } = props
    return (
      <code className="font-mono text-[0.8em] not-italic" {...rest}>
        {children}
      </code>
    )
  }
  if ((className as string)?.startsWith("language-")) {
    return (
      <code className={className as string} {...props}>
        {children}
      </code>
    )
  }
  return (
    <code
      className="border-tech-main/30 bg-tech-main/10 text-tech-main mx-1 border px-1 py-[0.05rem] font-mono text-[0.8em] not-italic"
      {...props}>
      {children}
    </code>
  )
}

export function PreComponent({ children, ...props }: MarkdownComponentProps) {
  return <CodeBlockPre {...props}>{children}</CodeBlockPre>
}
