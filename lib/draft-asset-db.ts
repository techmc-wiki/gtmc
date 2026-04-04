import { createClient } from "@supabase/supabase-js"

export interface DraftAsset {
  id: string
  revisionId: string
  storagePath: string
  mimeType: string
  fileSize: number
  filename: string
  contentHash: string | null
  status: string
  githubPrNum: number | null
  migratedRepoPath: string | null
  cleanupAttempts: number
  cleanupFailedAt: string | null
  cleanupFailureReason: string | null
  uploadedAt: string
  migratedAt: string | null
  deletedAt: string | null
  updatedAt: string
}

function getDbClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration. Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createDraftAsset(data: {
  revisionId: string
  storagePath: string
  mimeType: string
  fileSize: number
  filename: string
  status: string
  contentHash: string
}): Promise<{ id: string }> {
  const db = getDbClient()
  const { data: row, error } = await db
    .from("DraftAsset")
    .insert(data)
    .select("id")
    .single()

  if (error) {
    throw new Error(`Failed to create DraftAsset: ${error.message}`)
  }

  return { id: row.id }
}

export async function findDraftAssetsByRevision(
  revisionId: string
): Promise<DraftAsset[]> {
  const db = getDbClient()
  const { data, error } = await db
    .from("DraftAsset")
    .select("*")
    .eq("revisionId", revisionId)

  if (error) {
    throw new Error(`Failed to query DraftAssets: ${error.message}`)
  }

  return data ?? []
}

export async function findDraftAssetsByRevisionForSubmit(
  revisionId: string
): Promise<
  Pick<
    DraftAsset,
    "id" | "storagePath" | "filename" | "contentHash" | "mimeType"
  >[]
> {
  const db = getDbClient()
  const { data, error } = await db
    .from("DraftAsset")
    .select("id, storagePath, filename, contentHash, mimeType")
    .eq("revisionId", revisionId)

  if (error) {
    throw new Error(`Failed to query DraftAssets for submit: ${error.message}`)
  }

  return data ?? []
}

export async function findFailedDraftAssets(
  revisionId: string
): Promise<Pick<DraftAsset, "id" | "storagePath">[]> {
  const db = getDbClient()
  const { data, error } = await db
    .from("DraftAsset")
    .select("id, storagePath")
    .eq("revisionId", revisionId)
    .eq("status", "cleanup-failed")
    .is("deletedAt", null)

  if (error) {
    throw new Error(`Failed to query failed DraftAssets: ${error.message}`)
  }

  return data ?? []
}

export async function findTempDraftAssetsForRevision(
  revisionId: string,
  tempPrefix: string
): Promise<Pick<DraftAsset, "id" | "storagePath">[]> {
  const db = getDbClient()
  const { data, error } = await db
    .from("DraftAsset")
    .select("id, storagePath")
    .eq("revisionId", revisionId)
    .is("deletedAt", null)
    .neq("status", "deleted")
    .like("storagePath", `${tempPrefix}%`)

  if (error) {
    throw new Error(
      `Failed to query temp DraftAssets for reconciler: ${error.message}`
    )
  }

  return data ?? []
}

export async function countCleanupFailedByRevision(
  revisionIds: string[]
): Promise<Map<string, number>> {
  if (revisionIds.length === 0) return new Map()

  const db = getDbClient()
  const { data, error } = await db
    .from("DraftAsset")
    .select("revisionId")
    .in("revisionId", revisionIds)
    .eq("status", "cleanup-failed")
    .is("deletedAt", null)

  if (error) {
    throw new Error(
      `Failed to count cleanup-failed DraftAssets: ${error.message}`
    )
  }

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    counts.set(row.revisionId, (counts.get(row.revisionId) ?? 0) + 1)
  }
  return counts
}

export async function markDraftAssetReferenced(
  revisionId: string,
  storagePaths: string[]
): Promise<void> {
  if (storagePaths.length === 0) return

  const db = getDbClient()
  const { error } = await db
    .from("DraftAsset")
    .update({ status: "referenced" })
    .eq("revisionId", revisionId)
    .is("deletedAt", null)
    .in("storagePath", storagePaths)
    .in("status", ["uploaded", "orphaned", "referenced"])

  if (error) {
    throw new Error(`Failed to mark DraftAssets referenced: ${error.message}`)
  }
}

export async function markDraftAssetOrphaned(
  revisionId: string,
  excludeStoragePaths: string[]
): Promise<void> {
  const db = getDbClient()
  let query = db
    .from("DraftAsset")
    .update({ status: "orphaned" })
    .eq("revisionId", revisionId)
    .is("deletedAt", null)
    .in("status", ["uploaded", "referenced", "orphaned"])

  if (excludeStoragePaths.length > 0) {
    query = query.not(
      "storagePath",
      "in",
      `(${excludeStoragePaths.map((p) => `"${p}"`).join(",")})`
    )
  }

  const { error } = await query

  if (error) {
    throw new Error(`Failed to mark DraftAssets orphaned: ${error.message}`)
  }
}

export async function markDraftAssetDeleted(assetId: string): Promise<void> {
  const db = getDbClient()
  const { error } = await db
    .from("DraftAsset")
    .update({ status: "deleted", deletedAt: new Date().toISOString() })
    .eq("id", assetId)

  if (error) {
    throw new Error(`Failed to mark DraftAsset deleted: ${error.message}`)
  }
}

export async function markDraftAssetCleanupFailed(
  assetId: string,
  reason: string
): Promise<void> {
  const db = getDbClient()

  // Fetch current cleanupAttempts to increment manually (Supabase JS v2 has no increment shorthand)
  const { data: current, error: fetchError } = await db
    .from("DraftAsset")
    .select("cleanupAttempts")
    .eq("id", assetId)
    .single()

  if (fetchError) {
    throw new Error(
      `Failed to fetch DraftAsset for cleanup-failed update: ${fetchError.message}`
    )
  }

  const { error } = await db
    .from("DraftAsset")
    .update({
      status: "cleanup-failed",
      cleanupAttempts: (current.cleanupAttempts ?? 0) + 1,
      cleanupFailedAt: new Date().toISOString(),
      cleanupFailureReason: reason,
    })
    .eq("id", assetId)

  if (error) {
    throw new Error(
      `Failed to mark DraftAsset cleanup-failed: ${error.message}`
    )
  }
}

export async function markDraftAssetOutcome(
  assetId: string,
  outcome: string
): Promise<void> {
  const db = getDbClient()
  const { error } = await db
    .from("DraftAsset")
    .update({ status: outcome })
    .eq("id", assetId)
    .is("deletedAt", null)
    .neq("status", "deleted")

  if (error) {
    throw new Error(`Failed to mark DraftAsset outcome: ${error.message}`)
  }
}

export async function markDraftAssetMigrated(
  assetId: string,
  repoPath: string,
  prNumber: number,
  migratedAt: Date
): Promise<void> {
  const db = getDbClient()
  const { error } = await db
    .from("DraftAsset")
    .update({
      status: "migrated-to-repo",
      migratedRepoPath: repoPath,
      githubPrNum: prNumber,
      migratedAt: migratedAt.toISOString(),
    })
    .eq("id", assetId)

  if (error) {
    throw new Error(`Failed to mark DraftAsset migrated: ${error.message}`)
  }
}
