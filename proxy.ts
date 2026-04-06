import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default async function proxy(request: NextRequest) {
  const session = await auth()

  if (request.nextUrl.pathname === "/login" && session?.user) {
    return NextResponse.redirect(new URL("/profile", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login"],
}
