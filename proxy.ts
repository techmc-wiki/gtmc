import { auth } from "@/lib/auth"
import createMiddleware from "next-intl/middleware"
import type { NextRequest } from "next/server"
import { routing } from "@/i18n/routing"

const intlMiddleware = createMiddleware(routing)
const privateRoutes = [
  "/admin",
  "/draft",
  "/glossary/edit",
  "/profile",
  "/review",
]
const protectedFeatureRoutes = ["/features/new"]
const localePattern = /^\/(en|zh)(?=\/|$)/

function getRequestOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (!host) {
    return req.nextUrl.origin
  }

  const protocol =
    req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.slice(0, -1)

  return `${protocol}://${host}`
}

function normalizeRedirectOrigin(
  req: NextRequest,
  response: Response
): Response {
  const location = response.headers.get("location")
  if (!location) {
    return response
  }

  const requestOrigin = getRequestOrigin(req)

  try {
    const redirectUrl = new URL(location)
    const requestUrl = new URL(requestOrigin)

    redirectUrl.protocol = requestUrl.protocol
    redirectUrl.host = requestUrl.host
    response.headers.set("location", redirectUrl.toString())
  } catch {
    return response
  }

  return response
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname
  const locale = pathname.match(localePattern)?.[1] ?? routing.defaultLocale
  const pathWithoutLocale = pathname.replace(localePattern, "") || "/"

  const isPrivateRoute = privateRoutes.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  )
  const isProtectedFeatureRoute = protectedFeatureRoutes.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  )

  if (isPrivateRoute || isProtectedFeatureRoute) {
    if (!req.auth?.user) {
      const loginUrl = new URL(`/${locale}/login`, getRequestOrigin(req))
      loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search)
      return Response.redirect(loginUrl)
    }
  }

  return normalizeRedirectOrigin(req, intlMiddleware(req))
})

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
