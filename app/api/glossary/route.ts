import { type NextRequest, NextResponse } from "next/server"
import { projectGlossaryIndex } from "@/lib/glossary/localized-index"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"

const GLOSSARY_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400"

export async function GET(request: NextRequest) {
  const { entries } = await loadGlossaryManifest()
  const locale = request.nextUrl.searchParams.get("locale") ?? "en"

  return NextResponse.json(projectGlossaryIndex(entries, locale), {
    headers: { "Cache-Control": GLOSSARY_CACHE_CONTROL },
  })
}
