import type { NextRequest } from "next/server"

export const DEV_FIXTURE_USER = {
  id: "gtmc-local-dev-fixture",
  name: "GTMC Local Debugger",
  email: "debug@gtmc.local",
  githubLogin: "gtmc-debug",
} as const

const DEV_SESSION_COOKIE = "authjs.session-token"

export function isDevFixtureAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.GTMC_DEV_FIXTURE_AUTH !== "0"
  )
}

export function isLocalDevelopmentRequest(request: NextRequest): boolean {
  // NextAuth may rewrite the URL origin to AUTH_URL/NEXTAUTH_URL before this
  // handler, while the incoming Host header remains the original request host.
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = (
    forwardedHost?.split(",")[0] ??
    request.headers.get("host") ??
    request.nextUrl.hostname
  )
    .split(":")[0]
    .replaceAll(/^\[|\]$/g, "")

  return host === "localhost" || host === "127.0.0.1" || host === "::1"
}

export function getDevSessionCookie(request: NextRequest) {
  const secure = request.nextUrl.protocol === "https:"
  const name = secure ? `__Secure-${DEV_SESSION_COOKIE}` : DEV_SESSION_COOKIE

  return { name, secure }
}
