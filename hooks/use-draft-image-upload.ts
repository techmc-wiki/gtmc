"use client"

import * as React from "react"

import { compressImageForUpload } from "@/lib/uploads/image-compression"
import { classifyFile, isImageMime } from "@/lib/uploads/file-upload"

interface DraftImageUploadResult {
  url: string
  filename: string
}

interface UseDraftImageUploadConfig {
  upload: (file: File) => Promise<DraftImageUploadResult>
  onInsertContent: (text: string) => void
  onShowBadge: (message: string, type: "info" | "error" | "progress") => void
  onClearBadge: () => void
}

export function useDraftImageUpload(config: UseDraftImageUploadConfig) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [isCompressing, setIsCompressing] = React.useState(false)

  const uploadFile = React.useCallback(
    async (file: File) => {
      if (isUploading) return

      const classification = classifyFile(file.type)
      if (!classification || !isImageMime(file.type)) {
        config.onShowBadge("IMAGE TYPE NOT ALLOWED_", "error")
        return
      }

      if (file.size > classification.maxBytes) {
        const maxMB = Math.round(classification.maxBytes / (1024 * 1024))
        config.onShowBadge(`IMAGE TOO LARGE_ (max ${maxMB}MB)`, "error")
        return
      }

      setIsUploading(true)
      setIsCompressing(true)

      const uploadId = crypto.randomUUID()
      const placeholder = `<!-- UPLOAD_PENDING_${uploadId} -->`
      config.onInsertContent(placeholder + "\n")

      try {
        config.onShowBadge("COMPRESSING_IMAGE...", "progress")
        const compressed = await compressImageForUpload(file)
        setIsCompressing(false)

        if (compressed.error) {
          throw new Error(compressed.error)
        }

        config.onShowBadge("UPLOADING_IMAGE...", "progress")
        const result = await config.upload(compressed.file)
        const displayName = result.filename.replace(/^\d+-/, "")

        config.onInsertContent(`![${displayName}](${result.url})`)
        config.onClearBadge()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload error"
        config.onShowBadge(`UPLOAD FAILED_ ${message}`, "error")
        config.onInsertContent("")
        console.error("Draft image upload error:", error)
      } finally {
        setIsUploading(false)
        setIsCompressing(false)
      }
    },
    [config, isUploading]
  )

  return { uploadFile, isUploading, isCompressing }
}
