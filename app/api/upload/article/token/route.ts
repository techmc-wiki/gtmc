import { NextRequest, NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

import { auth } from "@/lib/auth"
import { classifyFile, getAllowedMimeTypes } from "@/lib/file-upload"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth()

        if (!session?.user) {
          throw new Error("Unauthorized")
        }

        let mimeType: string | undefined

        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload) as { mimeType?: string }
            mimeType = parsed.mimeType
          } catch {
            throw new Error("Invalid client payload")
          }
        }

        if (mimeType) {
          const classification = classifyFile(mimeType)
          if (!classification) {
            throw new Error("File type not allowed")
          }
        }

        return {
          allowedContentTypes: mimeType ? [mimeType] : getAllowedMimeTypes(),
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: false,
          allowedOrigins: process.env.NEXT_PUBLIC_APP_URL
            ? [process.env.NEXT_PUBLIC_APP_URL]
            : undefined,
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token generation failed"

    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
