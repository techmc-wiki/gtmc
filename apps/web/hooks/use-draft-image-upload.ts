"use client"

import * as React from "react"
import { toast } from "sonner"

import { compressImageForUpload } from "@/lib/uploads/image-compression"
import { classifyFile, isImageMime } from "@/lib/uploads/file-upload"

interface DraftImageUploadResult {
  url: string
  filename: string
}

interface UseDraftImageUploadConfig {
  upload: (file: File) => Promise<DraftImageUploadResult>
  onInsertContent: (text: string) => void
}

export function useDraftImageUpload(config: UseDraftImageUploadConfig) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [isCompressing, setIsCompressing] = React.useState(false)

  const uploadFile = React.useCallback(
    async (file: File) => {
      if (isUploading) return

      const classification = classifyFile(file.type)
      if (!classification || !isImageMime(file.type)) {
        toast.error("Image type not allowed")
        return
      }

      if (file.size > classification.maxBytes) {
        const maxMB = Math.round(classification.maxBytes / (1024 * 1024))
        toast.error(`Image too large (max ${maxMB}MB)`)
        return
      }

      setIsUploading(true)
      setIsCompressing(true)

      const uploadId = crypto.randomUUID()
      const placeholder = `<!-- UPLOAD_PENDING_${uploadId} -->`
      config.onInsertContent(placeholder + "\n")

      let stageToastId: string | number | undefined
      try {
        stageToastId = toast.loading("Compressing image…")
        const compressed = await compressImageForUpload(file)
        setIsCompressing(false)

        if (compressed.error) {
          throw new Error(compressed.error)
        }
        toast.dismiss(stageToastId)
        stageToastId = toast.loading("Uploading image…")
        const result = await config.upload(compressed.file)
        const displayName = result.filename.replace(/^\d+-/, "")

        config.onInsertContent(`![${displayName}](${result.url})`)
        toast.dismiss(stageToastId)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload error"
        toast.dismiss(stageToastId)
        toast.error(`Upload failed: ${message}`)
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
