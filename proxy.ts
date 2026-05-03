import { auth } from "@/lib/auth"
import createMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

const intlMiddleware = createMiddleware(routing)
const privateRoutes = ["/admin", "/features", "/draft", "/profile", "/review"]
const localePattern = /^\/(en|zh)(?=\/|$)/

export default auth((req) => {
  const pathname = req.nextUrl.pathname
  const locale = pathname.match(localePattern)?.[1] ?? routing.defaultLocale
  const pathWithoutLocale = pathname.replace(localePattern, "") || "/"

  if (privateRoutes.some((route) => pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`))) {
    if (!req.auth?.user) {
      const loginUrl = new URL(`/${locale}/login`, req.url)
      loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search)
      return Response.redirect(loginUrl)
    }
  }

  return intlMiddleware(req)
})

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
