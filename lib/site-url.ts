const FALLBACK_SITE_URL = "http://localhost:3000"

function normalizeSiteUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    parsed.pathname = ""
    parsed.search = ""
    parsed.hash = ""
    return parsed.toString().replace(/\/$/, "")
  } catch {
    return FALLBACK_SITE_URL
  }
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!configured) {
    return FALLBACK_SITE_URL
  }

  return normalizeSiteUrl(configured)
}

export function toAbsoluteUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`
  return `${getSiteUrl()}${normalizedPath}`
}
