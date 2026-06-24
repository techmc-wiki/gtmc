import { NextResponse } from "next/server"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"

const GLOSSARY_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400"

export async function GET() {
  const { entries } = await loadGlossaryManifest()

  return NextResponse.json(entries, {
    headers: { "Cache-Control": GLOSSARY_CACHE_CONTROL },
  })
}
