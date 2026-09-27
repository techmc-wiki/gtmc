import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

const PLAYER_EMBED_TOKENS = "allow-scripts allow-popups allow-same-origin"
const DEFAULT_EMBED_TOKENS = "allow-scripts allow-popups"

/**
 * The player whose bundle reads `localStorage` while booting. In an opaque origin that read
 * throws and the player never renders, so this frame needs `allow-same-origin`. It is a
 * third-party player origin, which keeps the frame on its own origin: it cannot reach this
 * document's DOM, and that is the precondition for `allow-same-origin` being safe here.
 *
 * Granting this to any other host is only safe under the same evidence: a third-party
 * player origin whose bundle fails to boot without it.
 */
const PLAYER_EMBED_HOST = "player.bilibili.com"

export function IframeComponent({
  src,
  className: _className,
  title,
  allowFullScreen,
  ...props
}: MarkdownComponentProps) {
  const {
    frameborder,
    frameBorder,
    scrolling,
    framespacing,
    marginheight,
    marginwidth,
    allowfullscreen,
    // The sandbox is derived from the source below, and `srcdoc` would load same-origin
    // inline markup in place of the embedded URL. Markdown must not control either.
    sandbox: _sandbox,
    srcDoc: _srcDoc,

    node: _node,
    ...rest
  } = props as Record<string, unknown>

  const embedSource = typeof src === "string" ? src : ""
  // Protocol-relative sources need a base to parse; the host decides the tokens. A source
  // that cannot be parsed is relative, so it resolves against this origin and stays opaque.
  let embedHost = ""
  try {
    embedHost = new URL(
      embedSource.startsWith("//") ? `https:${embedSource}` : embedSource
    ).hostname
  } catch {
    embedHost = ""
  }

  return (
    <div className="guide-line bg-tech-main/5 my-6 aspect-video w-full overflow-hidden rounded-xs border">
      <iframe
        src={src as string}
        title={(title as string) || "Embedded Video"}
        className="size-full"
        loading="lazy"
        sandbox={
          embedHost === PLAYER_EMBED_HOST
            ? PLAYER_EMBED_TOKENS
            : DEFAULT_EMBED_TOKENS
        }
        allowFullScreen={allowFullScreen !== false}
        {...rest}
      />
    </div>
  )
}
