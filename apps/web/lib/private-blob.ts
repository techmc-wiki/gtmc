/**
 * Access to the private blob store shared by drafts and profiles.
 *
 * Both keyspaces live in the same private store and follow the same identifier
 * rules, but they are independent layouts: `drafts/<authorId>/<id>.json` and
 * `profiles/<userId>/profile.json`. Only the token lookup and the identifier
 * check are shared here; each keyspace builds its own keys, so neither module
 * depends on the other's path construction.
 */

export function privateBlobOptions() {
  const token = process.env.DRAFT_BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error(
      "Private draft storage is not configured (DRAFT_BLOB_READ_WRITE_TOKEN)"
    )
  }
  return { token }
}

export function assertPrivateBlobIdentifier(...segments: string[]) {
  for (const segment of segments) {
    if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
      throw new Error("Invalid draft identifier")
    }
  }
}
