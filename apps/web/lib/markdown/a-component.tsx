import { Link } from "@/i18n/navigation"
import { articleUrl } from "@/lib/articles/url"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"
import { hasExplicitUrlScheme, resolveRelativeArticlePath } from "./url-utils"

function resolveHref(initialHref: string, rawPath: string): string {
  let href = initialHref
  if (href.startsWith("./") || href.startsWith("../")) {
    try {
      const resolved = resolveRelativeArticlePath(rawPath, href)
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
    const resolved = resolveRelativeArticlePath(rawPath, href)
    href = articleUrl(resolved)
  }
  return href
}

export function createAComponent(rawPath: string, locale?: string) {
  function AComponent({
    href: initialHref,
    children,
    ...props
  }: MarkdownComponentProps) {
    const href = resolveHref((initialHref as string) || "", rawPath)
    const localizedHref =
      locale && href.startsWith("/") ? `/${locale}${href}` : href
    if (props["data-in-code"] === "true") {
      const { "data-in-code": _inCode, ...rest } = props
      if (locale) {
        return (
          <a
            href={localizedHref}
            className="bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg inline-block cursor-pointer px-1 py-[0.05rem] font-mono text-[0.8em] underline transition-colors hover:no-underline"
            {...rest}>
            {children}
          </a>
        )
      }
      return (
        <Link
          href={href}
          locale={locale}
          className="bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg inline-block cursor-pointer px-1 py-[0.05rem] font-mono text-[0.8em] underline transition-colors hover:no-underline"
          {...rest}>
          {children}
        </Link>
      )
    }
    if (props["data-has-code"] === "true") {
      const { "data-has-code": _hasCode, ...rest } = props
      if (locale) {
        return (
          <a
            href={localizedHref}
            className="group/lc text-tech-main font-mono"
            {...rest}>
            {children}
          </a>
        )
      }
      return (
        <Link
          href={href}
          locale={locale}
          className="group/lc text-tech-main font-mono"
          {...rest}>
          {children}
        </Link>
      )
    }
    if (locale) {
      return (
        <a
          href={localizedHref}
          className="text-tech-main hover:bg-tech-main-dark hover:text-tech-bg cursor-pointer px-0.5 font-sans underline underline-offset-4 transition-colors hover:no-underline"
          {...props}>
          {children}
        </a>
      )
    }
    return (
      <Link
        href={href}
        locale={locale}
        className="text-tech-main hover:bg-tech-main-dark hover:text-tech-bg cursor-pointer px-0.5 font-sans underline underline-offset-4 transition-colors hover:no-underline"
        {...props}>
        {children}
      </Link>
    )
  }

  AComponent.displayName = "AComponent"

  return AComponent
}
