import { createHash } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createDraftAsset } from "@/lib/draft-asset-db"
import {
  DraftStorageConfigError,
  computeDraftStoragePath,
  deleteDraftAsset,
  uploadDraftAsset,
} from "@/lib/draft-storage"
import { classifyFile, isImageMime, sanitizeFilename } from "@/lib/file-upload"

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

    const revision = await prisma.revision.findUnique({
      where: { id: revisionId },
      select: { authorId: true },
    })

    if (!revision || revision.authorId !== userId) {
      return NextResponse.json(
        { error: "You do not have access to this revision." },
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
    const contentHash = createHash("sha256").update(buffer).digest("hex")
    const storagePath = computeDraftStoragePath(revisionId, filename)

    const { publicUrl } = await uploadDraftAsset(storagePath, buffer, file.type)

    try {
      const asset = await createDraftAsset({
        revisionId,
        storagePath,
        mimeType: file.type,
        fileSize: buffer.length,
        filename,
        status: "uploaded",
        contentHash,
      })

      return NextResponse.json({
        assetId: asset.id,
        url: publicUrl,
        storagePath,
        mimeType: file.type,
        fileSize: buffer.length,
        filename,
      })
    } catch (dbError) {
      try {
        await deleteDraftAsset(storagePath)
      } catch (cleanupError) {
        console.error("Draft upload cleanup error:", cleanupError)
      }

      throw dbError
    }
  } catch (error) {
    if (error instanceof DraftStorageConfigError) {
      return NextResponse.json(
        { error: "Draft upload is not configured on this server." },
        { status: 500 }
      )
    }

    console.error("Draft upload error:", error)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}
