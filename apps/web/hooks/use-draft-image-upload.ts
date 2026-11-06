"use client"

import * as React from "react"
import { toast } from "sonner"

import { compressImageForUpload } from "@/lib/uploads/image-compression"
import { classifyFile, isImageMime } from "@/lib/uploads/file-upload"

export type DraftImageUploadPhase = "idle" | "compressing" | "uploading"

interface DraftImageUploadResult {
  url: string
  filename: string
}

interface UseDraftImageUploadConfig {
  upload: (file: File) => Promise<DraftImageUploadResult>
  onInsertPlaceholder: (uploadId: string) => void
  onReplacePlaceholder: (uploadId: string, text: string) => void
  onRemovePlaceholder: (uploadId: string) => void
  beforeUpload?: () => Promise<void>
}

export function createUploadPlaceholder(uploadId: string) {
  return `<!-- UPLOAD_PENDING_${uploadId} -->`
}

export function useDraftImageUpload(config: UseDraftImageUploadConfig) {
  const [phase, setPhase] = React.useState<DraftImageUploadPhase>("idle")
  const inFlightRef = React.useRef(false)

  const uploadFile = React.useCallback(
    async (file: File) => {
      if (inFlightRef.current) return
      inFlightRef.current = true

      const classification = classifyFile(file.type)
      if (!classification || !isImageMime(file.type)) {
        inFlightRef.current = false
        toast.error("Image type not allowed")
        return
      }

      if (file.size > classification.maxBytes) {
        const maxMB = Math.round(classification.maxBytes / (1024 * 1024))
        inFlightRef.current = false
        toast.error(`Image too large (max ${maxMB}MB)`)
        return
      }

      const uploadId = crypto.randomUUID()
      setPhase("compressing")
      config.onInsertPlaceholder(uploadId)

      let stageToastId: string | number | undefined
      try {
        await config.beforeUpload?.()

        stageToastId = toast.loading("Compressing image…")
        const compressed = await compressImageForUpload(file)
        if (compressed.error) {
          throw new Error(compressed.error)
        }

        toast.dismiss(stageToastId)
        stageToastId = toast.loading("Uploading image…")
        setPhase("uploading")
        const result = await config.upload(compressed.file)
        const displayName = result.filename.replace(/^\d+-/, "")

        config.onReplacePlaceholder(
          uploadId,
          `![${displayName}](${result.url})`
        )
        toast.dismiss(stageToastId)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload error"
        toast.dismiss(stageToastId)
        toast.error(`Upload failed: ${message}`)
        config.onRemovePlaceholder(uploadId)
        console.error("Draft image upload error:", error)
      } finally {
        inFlightRef.current = false
        setPhase("idle")
      }
    },
    [config]
  )

  return {
    uploadFile,
    phase,
    isUploading: phase !== "idle",
    isCompressing: phase === "compressing",
  }
}
