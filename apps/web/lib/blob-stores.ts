/**
 * Vercel Blob store selection shared by drafts and profiles.
 *
 * Blob connections authenticate through Vercel OIDC: the SDK reads
 * `VERCEL_OIDC_TOKEN`, which Vercel issues and rotates automatically, and pairs
 * it with the store id. Only the store id lives in the environment, so no
 * long-lived read-write token is needed.
 *
 * Drafts and profiles share the private store and follow the same identifier
 * rules, but they are independent layouts: `drafts/<authorId>/<id>.json` and
 * `profiles/<userId>/profile.json`. Each keyspace builds its own keys; only the
 * store lookup and the identifier check are shared here.
 */

function blobStoreOptions(envVar: string, label: string) {
  const storeId = process.env[envVar]
  if (!storeId) {
    throw new Error(`${label} is not configured (${envVar})`)
  }
  return { storeId }
}

export function privateBlobOptions() {
  return blobStoreOptions("DRAFT_BLOB_STORE_ID", "Private draft storage")
}

export function assertPrivateBlobIdentifier(...segments: string[]) {
  for (const segment of segments) {
    if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
      throw new Error("Invalid draft identifier")
    }
  }
}
