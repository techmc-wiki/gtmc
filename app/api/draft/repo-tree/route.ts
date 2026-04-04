import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { getDraftRepoTree } from "@/lib/draft-repo-browser"

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tree = await getDraftRepoTree()
  return NextResponse.json({ tree })
}
