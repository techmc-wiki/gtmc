import { get } from "@vercel/blob"
import { auth } from "@/lib/auth"
import { draftBlobOptions, readDraft } from "@/lib/drafts/store"
import { draftAssetPrefix } from "@/lib/drafts/storage"

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ authorId: string; id: string; filename: string }> }
) {
  const session = await auth()
  const { authorId, id, filename } = await params
  if (!session?.user?.id || session.user.id !== authorId) {
    return new Response(null, { status: 401 })
  }
  if (
    filename.includes("/") ||
    filename.includes("\\") ||
    filename === "." ||
    filename === ".."
  ) {
    return new Response(null, { status: 400 })
  }
  const record = await readDraft(authorId, id)
  if (!record || record.draft.kind !== "article") {
    return new Response(null, { status: 404 })
  }
  const blob = await get(`${draftAssetPrefix(authorId, id)}${filename}`, {
    ...draftBlobOptions(),
    access: "private",
  })
  if (!blob) return new Response(null, { status: 404 })
  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  })
}
