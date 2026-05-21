import { getRepoFileBuffer } from "@/lib/github/sync"

export async function getArticleRemoteBuffer(
  filePath: string
): Promise<Buffer | null> {
  return getRepoFileBuffer(filePath)
}
