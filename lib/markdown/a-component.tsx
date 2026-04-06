import { Link } from "@/i18n/navigation"
import path from "path"
import { articleUrl } from "@/lib/article-url"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

function resolveHref(initialHref: string, rawPath: string): string {
  let href = initialHref
  if (href.startsWith("./") || href.startsWith("../")) {
    const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "")
    try {
      const resolved = path.join(currentDir, href).replace(/\\/g, "/")
      href = articleUrl(resolved)
    } catch {
      return href
    }
  } else if (
    !href.startsWith("http") &&
    !href.startsWith("#") &&
    !href.startsWith("/")
  ) {
    const currentDir = path.dirname("/" + rawPath).replace(/^\/+/, "")
    const resolved = path.join(currentDir, href).replace(/\\/g, "/")
    href = articleUrl(resolved)
  }
  return href
}

export function createAComponent(rawPath: string) {
  function AComponent({
    href: initialHref,
    children,
    ...props
  }: MarkdownComponentProps) {
    const href = resolveHref((initialHref as string) || "", rawPath)
    if (props["data-in-code"] === "true") {
      const { "data-in-code": _inCode, ...rest } = props
      return (
        <Link
          href={href}
          className="
            inline-block cursor-pointer bg-tech-main/10 px-1 py-[0.05rem]
            font-mono text-[0.8em] text-tech-main underline transition-colors
            hover:bg-tech-main/80 hover:text-white hover:no-underline
          "
          {...rest}>
          {children}
        </Link>
      )
    }
    if (props["data-has-code"] === "true") {
      const { "data-has-code": _hasCode, ...rest } = props
      return (
        <Link
          href={href}
          className="group/lc font-mono text-tech-main"
          {...rest}>
          {children}
        </Link>
      )
    }
    return (
      <Link
        href={href}
        className="
          cursor-pointer px-0.5 font-sans text-tech-main underline
          underline-offset-4 transition-colors
          hover:bg-tech-main/80 hover:text-white hover:no-underline
        "
        {...props}>
        {children}
      </Link>
    )
  }

  AComponent.displayName = "AComponent"

  return AComponent
}
