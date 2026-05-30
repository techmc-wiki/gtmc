import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function IframeComponent({
  src,
  className: _className,
  title,
  allowFullScreen,
  ...props
}: MarkdownComponentProps) {
  // Remove deprecated or non-standard DOM attributes
  const {
    frameborder,
    frameBorder,
    scrolling,
    framespacing,
    marginheight,
    marginwidth,
    allowfullscreen,

    node: _node,
    ...rest
  } = props as Record<string, unknown>

  return (
    <div className="guide-line bg-tech-main/5 my-6 aspect-video w-full overflow-hidden rounded-xs border">
      <iframe
        src={src as string}
        title={(title as string) || "Embedded Video"}
        className="size-full"
        loading="lazy"
        sandbox="allow-scripts allow-popups"
        allowFullScreen={allowFullScreen !== false}
        {...rest}
      />
    </div>
  )
}
