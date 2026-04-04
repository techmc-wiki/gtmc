"use client"

import * as React from "react"
import { compressImageForUpload } from "@/lib/image-compression"
import {
  classifyFile,
  isImageMime,
  sanitizeFilename,
  generateMarkdownBlock,
  VERCEL_BODY_LIMIT_BYTES,
} from "@/lib/file-upload"
import { upload } from "@vercel/blob/client"

/**
 * Response shape from the upload adapter.
 * The adapter abstracts backend-specific details (feature vs draft endpoints).
 */
export interface UploadAdapterResponse {
  url: string
  filename: string
  mimeType: string
  fileSize: number
}

/**
 * Configuration for the upload hook.
 * Allows different editors (feature, draft) to use different backends.
 */
export interface UseEditorUploadConfig {
  /**
   * Async function that handles the actual file upload.
   * Called with the file (possibly compressed for images) and returns metadata.
   * Must handle FormData construction and endpoint-specific logic.
   */
  adapter: (file: File) => Promise<UploadAdapterResponse>

  /**
   * Callback to insert text (placeholder or markdown) into the editor.
   */
  onInsertContent: (text: string) => void

  /**
   * Callback to show a status badge (progress, error, info).
   */
  onShowBadge: (message: string, type: "info" | "error" | "progress") => void

  /**
   * Callback to clear the status badge.
   */
  onClearBadge: () => void
}

/**
 * Return value from the hook.
 */
export interface UseEditorUploadReturn {
  uploadFile: (file: File) => Promise<void>
  isUploading: boolean
  isCompressing: boolean
}

/**
 * Shared upload orchestration hook for editors.
 *
 * Handles:
 * - File validation (MIME type, size)
 * - Placeholder insertion
 * - Image compression
 * - Upload via injected adapter
 * - Markdown block generation
 * - Placeholder replacement on success
 * - Placeholder cleanup on failure
 *
 * The adapter is injectable so different editors can use different endpoints
 * without duplicating the orchestration logic.
 */
export function useEditorUpload(
  config: UseEditorUploadConfig
): UseEditorUploadReturn {
  const [isUploading, setIsUploading] = React.useState(false)
  const [isCompressing, setIsCompressing] = React.useState(false)

  const uploadFile = React.useCallback(
    async (file: File) => {
      if (isUploading) return

      const classification = classifyFile(file.type)
      if (!classification) {
        config.onShowBadge("FILE TYPE NOT ALLOWED_", "error")
        return
      }

      if (file.size > classification.maxBytes) {
        const maxMB = Math.round(classification.maxBytes / (1024 * 1024))
        config.onShowBadge(`FILE TOO LARGE_ (max ${maxMB}MB)`, "error")
        return
      }

      setIsUploading(true)

      const uploadId = crypto.randomUUID()
      const placeholder = `<!-- UPLOAD_PENDING_${uploadId} -->`
      config.onInsertContent(placeholder + "\n")

      try {
        let resultUrl: string
        let resultFilename: string
        let resultMimeType: string
        let resultFileSize: number

        if (isImageMime(file.type)) {
          setIsCompressing(true)
          config.onShowBadge("COMPRESSING_IMAGE...", "progress")

          const compressed = await compressImageForUpload(file)
          setIsCompressing(false)

          if (compressed.error) {
            config.onShowBadge(`UPLOAD FAILED_ ${compressed.error}`, "error")
            config.onInsertContent(placeholder)
            setIsUploading(false)
            return
          }

          config.onShowBadge("UPLOADING_IMAGE...", "progress")

          const result = await config.adapter(compressed.file)
          resultUrl = result.url
          resultFilename = result.filename
          resultMimeType = result.mimeType
          resultFileSize = result.fileSize
        } else if (file.size < VERCEL_BODY_LIMIT_BYTES) {
          config.onShowBadge("UPLOADING_FILE...", "progress")

          const result = await config.adapter(file)
          resultUrl = result.url
          resultFilename = result.filename
          resultMimeType = result.mimeType
          resultFileSize = result.fileSize
        } else {
          config.onShowBadge("UPLOADING_ 0%", "progress")

          const blobResult = await upload(
            sanitizeFilename(file.name, file.type),
            file,
            {
              access: "public",
              handleUploadUrl: "/api/upload/feature/token",
              clientPayload: JSON.stringify({
                mimeType: file.type,
                originalSize: file.size,
              }),
              onUploadProgress: ({ percentage }) => {
                config.onShowBadge(
                  `UPLOADING_ ${Math.round(percentage)}%`,
                  "progress"
                )
              },
            }
          )

          config.onShowBadge("COMMITTING_TO_GITHUB...", "progress")

          const commitRes = await fetch("/api/upload/feature/commit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blobUrl: blobResult.url,
              filename: file.name,
              mimeType: file.type,
              size: file.size,
            }),
          })

          const commitData = await commitRes.json()
          if (!commitRes.ok)
            throw new Error(commitData.error || "Commit failed")

          resultUrl = commitData.url
          resultFilename = commitData.filename
          resultMimeType = commitData.mimeType
          resultFileSize = commitData.fileSize
        }

        const markdownBlock = generateMarkdownBlock(
          resultFilename,
          resultUrl,
          resultMimeType,
          resultFileSize
        )
        config.onInsertContent(markdownBlock)
        config.onClearBadge()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload error"
        config.onShowBadge(`UPLOAD FAILED_ ${message}`, "error")
        config.onInsertContent(placeholder)
        console.error("File upload error:", error)
      } finally {
        setIsUploading(false)
        setIsCompressing(false)
      }
    },
    [isUploading, config]
  )

  return {
    uploadFile,
    isUploading,
    isCompressing,
  }
}
