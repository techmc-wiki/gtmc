import { NextResponse, type NextRequest } from "next/server"
import { resolvePerson } from "@/lib/markdown/people"

const PEOPLE_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600"

export function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? ""

  return NextResponse.json(resolvePerson(key), {
    headers: { "Cache-Control": PEOPLE_CACHE_CONTROL },
  })
}
