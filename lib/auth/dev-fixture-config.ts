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
  // Judge by the incoming Host header rather than `request.nextUrl.hostname`:
  // when `AUTH_URL`/`NEXTAUTH_URL` is set, NextAuth's middleware wrapper
  // rewrites the request URL's origin to that host (see `reqWithEnvURL` in
  // next-auth/lib/env.js) before our handler runs. The header survives the
  // clone, so this stays correct for both the original and rewritten requests.
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = (
    forwardedHost?.split(",")[0] ??
    request.headers.get("host") ??
    request.nextUrl.hostname
  )
    .split(":")[0]
    .replaceAll(/^\[|\]$/g, "") // strip IPv6 brackets from e.g. [::1]:3000

  return host === "localhost" || host === "127.0.0.1" || host === "::1"
}

export function getDevSessionCookie(request: NextRequest) {
  const secure = request.nextUrl.protocol === "https:"
  const name = secure ? `__Secure-${DEV_SESSION_COOKIE}` : DEV_SESSION_COOKIE

  return { name, secure }
}
