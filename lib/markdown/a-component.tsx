import { Link } from "@/i18n/navigation"
import path from "path"
import { articleUrl } from "@/lib/article-url"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"
import { hasExplicitUrlScheme } from "./url-utils"

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
  } else if (hasExplicitUrlScheme(href)) {
    return href
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
          className="bg-tech-main/10 text-tech-main hover:bg-tech-main/80 inline-block cursor-pointer px-1 py-[0.05rem] font-mono text-[0.8em] underline transition-colors hover:text-white hover:no-underline"
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
          className="group/lc text-tech-main font-mono"
          {...rest}>
          {children}
        </Link>
      )
    }
    return (
      <Link
        href={href}
        className="text-tech-main hover:bg-tech-main/80 cursor-pointer px-0.5 font-sans underline underline-offset-4 transition-colors hover:text-white hover:no-underline"
        {...props}>
        {children}
      </Link>
    )
  }

  AComponent.displayName = "AComponent"

  return AComponent
}
