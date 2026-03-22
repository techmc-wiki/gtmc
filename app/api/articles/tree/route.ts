import { NextResponse } from "next/server"
import { getSidebarTree } from "@/actions/sidebar"

export async function GET() {
  try {
    const tree = await getSidebarTree()
    return NextResponse.json(tree, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return NextResponse.json([], {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
      },
    })
  }
}
