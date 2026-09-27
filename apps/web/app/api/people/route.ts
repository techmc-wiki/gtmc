import { NextResponse, type NextRequest } from "next/server"
import { resolvePerson } from "@/lib/markdown/people"
import { getAuthorProfileHandle } from "@/lib/articles/person-resolver"

const PEOPLE_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600"

export function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? ""
  const person = resolvePerson(key)

  return NextResponse.json(
    { ...person, profileHandle: getAuthorProfileHandle(person.key) },
    { headers: { "Cache-Control": PEOPLE_CACHE_CONTROL } }
  )
}
