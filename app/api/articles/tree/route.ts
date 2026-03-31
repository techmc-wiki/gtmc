import { NextResponse } from "next/server"
import { getSidebarTree } from "@/actions/sidebar"

const TREE_CACHE_CONTROL = "private, max-age=60, stale-while-revalidate=300"

export async function GET() {
  try {
    const tree = await getSidebarTree()
    return NextResponse.json(tree, {
      headers: {
        "Cache-Control": TREE_CACHE_CONTROL,
      },
    })
  } catch {
    return NextResponse.json([], {
      status: 200,
      headers: {
        "Cache-Control": TREE_CACHE_CONTROL,
      },
    })
  }
}
