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
