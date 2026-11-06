export type ImageAsset =
  | { readonly path: string }
  | { readonly missing: string }

export interface MermaidAsset {
  readonly path: string
}

export interface EmitContext {
  readonly articleSlug: string
  readonly locale: "en" | "zh"
  /** The exact string passed to `#article(title:)`; a top-level body `h1` equal to it is dropped. */
  readonly title: string
  /** Maps a relative or site-absolute href to an xref id, or null when it is not a book article. */
  readonly resolveArticleLink: (href: string) => string | null
  readonly assets: {
    readonly image: (src: string) => ImageAsset | null
    readonly mermaid: (source: string) => MermaidAsset | null
  }
  readonly math: (tex: string, display: boolean) => string
}

export interface TypstEmitErrorDetails {
  readonly articleSlug: string
  readonly element: string
  readonly classes: readonly string[]
}

export class TypstEmitError extends Error {
  readonly articleSlug: string
  readonly element: string
  readonly classes: readonly string[]

  constructor(message: string, details: TypstEmitErrorDetails) {
    const classes = details.classes.map((name) => `.${name}`).join("")
    super(`${details.articleSlug}: <${details.element}${classes}>: ${message}`)
    this.name = "TypstEmitError"
    this.articleSlug = details.articleSlug
    this.element = details.element
    this.classes = details.classes
  }
}
