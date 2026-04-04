/**
 * lib/draft-storage.ts
 *
 * Server-only Supabase storage utilities for draft images.
 * This module handles upload, download, and deletion of temporary draft assets.
 *
 * REQUIRED ENV VARS (server-only, never expose to client):
 * - SUPABASE_URL: Supabase project URL (e.g., https://project.supabase.co)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (server-only, never use NEXT_PUBLIC_ prefix)
 * - DRAFT_STORAGE_BUCKET: Bucket name (default: "gtmc-drafts")
 * - DRAFT_STORAGE_TEMP_PREFIX: Temp path prefix (default: "draft-temp")
 *
 * Path format: draft-temp/{revisionId}/{uuid}.{ext}
 * This scopes all assets to a revision for efficient cleanup queries.
 */

import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import path from "path"

// ---------------------------------------------------------------------------
// Config Error
// ---------------------------------------------------------------------------

export class DraftStorageConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DraftStorageConfigError"
  }
}

// ---------------------------------------------------------------------------
// Config Guard
// ---------------------------------------------------------------------------

interface DraftStorageConfig {
  url: string
  key: string
  bucket: string
  prefix: string
}

function getDraftStorageConfig(): DraftStorageConfig {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.DRAFT_STORAGE_BUCKET ?? "gtmc-drafts"
  const prefix = process.env.DRAFT_STORAGE_TEMP_PREFIX ?? "draft-temp"

  if (!url || !key) {
    throw new DraftStorageConfigError(
      "Missing Supabase configuration. Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return { url, key, bucket, prefix }
}

// ---------------------------------------------------------------------------
// Client Creation (server-only)
// ---------------------------------------------------------------------------

function createSupabaseClient() {
  const config = getDraftStorageConfig()
  return createClient(config.url, config.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// ---------------------------------------------------------------------------
// Path Generation
// ---------------------------------------------------------------------------

/**
 * Compute a draft storage path for a temporary asset.
 * Format: draft-temp/{revisionId}/{uuid}.{ext}
 *
 * @param revisionId - Revision ID to scope the asset
 * @param filename - Original filename (used to extract extension)
 * @returns Storage path (e.g., "draft-temp/rev-abc123/550e8400-e29b-41d4-a716-446655440000.png")
 */
export function computeDraftStoragePath(
  revisionId: string,
  filename: string
): string {
  const config = getDraftStorageConfig()
  const ext = path.extname(filename).toLowerCase().slice(1) || "bin"
  const uuid = randomUUID()
  return `${config.prefix}/${revisionId}/${uuid}.${ext}`
}

// ---------------------------------------------------------------------------
// Public URL Generation
// ---------------------------------------------------------------------------

/**
 * Generate the public URL for a draft asset.
 *
 * @param storagePath - Storage path (e.g., "draft-temp/rev-abc123/file.png")
 * @returns Public URL
 */
export function getDraftAssetPublicUrl(storagePath: string): string {
  const config = getDraftStorageConfig()
  const client = createSupabaseClient()
  const { data } = client.storage.from(config.bucket).getPublicUrl(storagePath)
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload a draft asset to Supabase storage.
 *
 * @param storagePath - Storage path (e.g., from computeDraftStoragePath)
 * @param data - File data (Buffer or Uint8Array)
 * @param mimeType - MIME type (e.g., "image/png")
 * @returns Object with publicUrl
 * @throws DraftStorageConfigError if config is missing
 * @throws Error if upload fails
 */
export async function uploadDraftAsset(
  storagePath: string,
  data: Buffer | Uint8Array,
  mimeType: string
): Promise<{ publicUrl: string }> {
  const config = getDraftStorageConfig()
  const client = createSupabaseClient()

  const { error } = await client.storage
    .from(config.bucket)
    .upload(storagePath, data, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    throw new Error(
      `Failed to upload draft asset to ${storagePath}: ${error.message}`
    )
  }

  const publicUrl = getDraftAssetPublicUrl(storagePath)
  return { publicUrl }
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Download a draft asset from Supabase storage.
 *
 * @param storagePath - Storage path (e.g., "draft-temp/rev-abc123/file.png")
 * @returns File data as Buffer
 * @throws DraftStorageConfigError if config is missing
 * @throws Error if download fails
 */
export async function downloadDraftAsset(storagePath: string): Promise<Buffer> {
  const config = getDraftStorageConfig()
  const client = createSupabaseClient()

  const { data, error } = await client.storage
    .from(config.bucket)
    .download(storagePath)

  if (error) {
    throw new Error(
      `Failed to download draft asset from ${storagePath}: ${error.message}`
    )
  }

  return Buffer.from(await data.arrayBuffer())
}

// ---------------------------------------------------------------------------
// Delete (Idempotent)
// ---------------------------------------------------------------------------

/**
 * Delete a draft asset from Supabase storage.
 * Idempotent: does not throw if the asset is already gone.
 *
 * @param storagePath - Storage path (e.g., "draft-temp/rev-abc123/file.png")
 * @throws DraftStorageConfigError if config is missing
 * @throws Error if deletion fails (other than 404)
 */
export async function deleteDraftAsset(storagePath: string): Promise<void> {
  const config = getDraftStorageConfig()
  const client = createSupabaseClient()

  const { error } = await client.storage
    .from(config.bucket)
    .remove([storagePath])

  // Idempotent: 404 is not an error (asset already gone or never existed)
  if (error && error.message !== "Not found") {
    throw new Error(
      `Failed to delete draft asset at ${storagePath}: ${error.message}`
    )
  }
}
