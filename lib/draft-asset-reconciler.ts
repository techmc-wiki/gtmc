import { deleteDraftAsset } from "@/lib/draft-storage"
import { prisma } from "@/lib/prisma"
import {
  findTempDraftAssetsForRevision,
  markDraftAssetCleanupFailed,
  markDraftAssetDeleted,
  markDraftAssetOutcome,
} from "@/lib/draft-asset-db"

export async function reconcileDraftAssetsForPRCompletion({
  prNumber,
  outcome,
}: {
  prNumber: number
  outcome: "PR-merged" | "PR-closed"
}): Promise<void> {
  const revision = await prisma.revision.findFirst({
    where: { githubPrNum: prNumber },
    select: { id: true },
  })

  if (!revision) {
    return
  }

  await prisma.revision.update({
    where: { id: revision.id },
    data: {
      status: outcome === "PR-merged" ? "MERGED" : "CLOSED",
    },
  })

  const tempPrefix = process.env.DRAFT_STORAGE_TEMP_PREFIX ?? "draft-temp"
  const assets = await findTempDraftAssetsForRevision(revision.id, tempPrefix)

  for (const asset of assets) {
    await markDraftAssetOutcome(asset.id, outcome)

    try {
      await deleteDraftAsset(asset.storagePath)
      await markDraftAssetDeleted(asset.id)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await markDraftAssetCleanupFailed(asset.id, `[${outcome}] ${reason}`)
    }
  }
}
