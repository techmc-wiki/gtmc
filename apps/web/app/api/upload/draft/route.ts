import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { readDraft } from "@/lib/drafts/store"
import { deleteDraftAsset, uploadDraftAsset } from "@/lib/drafts/storage"
import {
  classifyFile,
  isImageMime,
  sanitizeFilename,
} from "@/lib/uploads/file-upload"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const revisionIdValue = formData.get("revisionId")
    const revisionId =
      typeof revisionIdValue === "string" ? revisionIdValue.trim() : ""

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    if (!revisionId) {
      return NextResponse.json(
        { error: "revisionId is required." },
        { status: 400 }
      )
    }

    const classification = classifyFile(file.type)
    if (!classification || !isImageMime(file.type)) {
      return NextResponse.json(
        { error: "Only image uploads are allowed." },
        { status: 400 }
      )
    }

    const record = await readDraft(userId, revisionId)
    if (
      !record ||
      record.draft.kind !== "article" ||
      record.draft.status !== "DRAFT"
    ) {
      return NextResponse.json(
        { error: "This draft cannot receive uploads." },
        { status: 403 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length > classification.maxBytes) {
      const maxMB = Math.round(classification.maxBytes / (1024 * 1024))
      return NextResponse.json(
        { error: `File too large (max ${maxMB}MB for images).` },
        { status: 400 }
      )
    }

    const filename = sanitizeFilename(file.name, file.type)
    const asset = await uploadDraftAsset(
      userId,
      revisionId,
      filename,
      buffer,
      file.type
    )
    try {
      const current = await readDraft(userId, revisionId)
      if (!current || current.draft.status !== "DRAFT") {
        throw new Error("Draft is no longer editable")
      }
      return NextResponse.json({
        ...asset,
        filename,
        mimeType: file.type,
        fileSize: buffer.length,
      })
    } catch (error) {
      await deleteDraftAsset(asset.storagePath)
      throw error
    }
  } catch (error) {
    console.error("Draft upload error:", error)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}
