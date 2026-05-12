import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return createNavAuthResponse(false)
  }

  try {
    const ctx = await getCurrentUserAuthContext(session.user.id)
    return createNavAuthResponse(ctx.role === "ADMIN")
  } catch {
    return createNavAuthResponse(false)
  }
}

function createNavAuthResponse(isAdmin: boolean) {
  return NextResponse.json(
    { isAdmin },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
