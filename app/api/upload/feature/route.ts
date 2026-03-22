import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  uploadFileToGithub,
  GithubFeaturesError,
} from "@/lib/github-features"
import { classifyFile, sanitizeFilename } from "@/lib/file-upload"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 },
      )
    }

    const classification = classifyFile(file.type)
    if (!classification) {
      return NextResponse.json(
        { error: "File type not allowed." },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length > classification.maxBytes) {
      const maxMB = Math.round(
        classification.maxBytes / (1024 * 1024),
      )
      return NextResponse.json(
        {
          error: `File too large (max ${maxMB}MB for ${classification.category}).`,
        },
        { status: 400 },
      )
    }

    const filename = sanitizeFilename(file.name, file.type)

    const url = await uploadFileToGithub(
      buffer,
      filename,
      file.type,
      classification.category,
    )

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
    if (error instanceof GithubFeaturesError) {
      if (error.code === "CONFIG_MISSING") {
        return NextResponse.json(
          { error: "Upload is not configured on this server." },
          { status: 500 },
        )
      }
      if (error.code === "AUTH_FAILED") {
        return NextResponse.json(
          { error: "Upload authorization failed." },
          { status: 403 },
        )
      }
      if (error.code === "RATE_LIMITED") {
        return NextResponse.json(
          {
            error:
              "Upload service temporarily unavailable. Try again shortly.",
          },
          { status: 429 },
        )
      }
      if (error.code === "API_ERROR") {
        return NextResponse.json(
          { error: "File upload failed. Please try again." },
          { status: 502 },
        )
      }
    }

    console.error("Feature upload error:", error)
    return NextResponse.json(
      { error: "Upload failed." },
      { status: 500 },
    )
  }
}
