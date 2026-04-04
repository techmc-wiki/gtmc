import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { classifyFile, sanitizeFilename } from "@/lib/file-upload"
import {
  uploadArticleAssetToGithub,
  ArticleAssetUploadError,
} from "@/lib/github/articles-assets"

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    const classification = classifyFile(file.type)
    if (!classification) {
      return NextResponse.json(
        { error: "File type not allowed." },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length > classification.maxBytes) {
      const maxMB = Math.round(classification.maxBytes / (1024 * 1024))
      return NextResponse.json(
        { error: `File too large (max ${maxMB}MB).` },
        { status: 400 }
      )
    }

    const filename = sanitizeFilename(file.name, file.type)
    const url = await uploadArticleAssetToGithub({
      buffer,
      category: classification.category,
      filename,
      token: (session.user as { githubPat?: string }).githubPat || null,
    })

    return NextResponse.json({
      success: true,
      url,
      filename,
      mimeType: file.type,
      fileSize: buffer.length,
      category: classification.category,
      proxyable: classification.proxyable,
    })
  } catch (error) {
    if (error instanceof ArticleAssetUploadError) {
      if (error.code === "CONFIG_MISSING") {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (error.code === "AUTH_FAILED") {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }

      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error("Article upload error:", error)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}
