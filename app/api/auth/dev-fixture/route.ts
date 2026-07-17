import { encode } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"

import { ensureDevFixtureUser } from "@/lib/auth/dev-fixture"
import {
  DEV_FIXTURE_USER,
  getDevSessionCookie,
  isDevFixtureAuthEnabled,
  isLocalDevelopmentRequest,
} from "@/lib/auth/dev-fixture-config"

const authSecret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "gtmc-local-dev-auth-secret"

function getSafeCallbackUrl(request: NextRequest): URL {
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl")
  if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//")) {
    return new URL("/", request.url)
  }

  return new URL(callbackUrl, request.url)
}

export async function GET(request: NextRequest) {
  if (!isDevFixtureAuthEnabled() || !isLocalDevelopmentRequest(request)) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    await ensureDevFixtureUser()
  } catch {
    return new NextResponse(
      "Local fixture authentication requires a reachable DATABASE_URL.",
      { status: 503 }
    )
  }

  const sessionCookie = getDevSessionCookie(request)
  const token = await encode({
    secret: authSecret,
    salt: sessionCookie.name,
    token: {
      sub: DEV_FIXTURE_USER.id,
      name: DEV_FIXTURE_USER.name,
      email: DEV_FIXTURE_USER.email,
      githubLogin: DEV_FIXTURE_USER.githubLogin,
      lastAuthAt: Date.now(),
    },
  })
  const response = NextResponse.redirect(getSafeCallbackUrl(request))

  response.cookies.set(sessionCookie.name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookie.secure,
    path: "/",
  })

  return response
}
