import { createHash } from "node:crypto"

import { prisma } from "@/lib/prisma"

export interface ConflictBlock {
  id: string
  filePath: string
  base: string
  ours: string
  theirs: string
  autoApplied?: { resolution: string; source: "rerere" }
}

export const SIMPLE_CONFLICT_BLOCK_RE =
  /<<<<<<< draft\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> main\n?/g

export function formatConflictMarker(ours: string, theirs: string): string {
  return `<<<<<<< draft\n${ours}=======\n${theirs}>>>>>>> main\n`
}

export function parseConflictBlocks(
  content: string,
  filePath: string,
  baseContent: string
): ConflictBlock[] {
  const blocks: ConflictBlock[] = []
  const regex = new RegExp(SIMPLE_CONFLICT_BLOCK_RE.source, "g")
  let match: RegExpExecArray | null
  let i = 0

  match = regex.exec(content)
  while (match !== null) {
    blocks.push({
      id: `conflict-${i++}`,
      filePath,
      base: baseContent,
      ours: match[1],
      theirs: match[2],
    })
    match = regex.exec(content)
  }

  return blocks
}

export function applyAutoAppliedResolutions(
  content: string,
  appliedBlocks: ConflictBlock[]
): string {
  if (appliedBlocks.length === 0) {
    return content
  }

  const appliedById = new Map(appliedBlocks.map((block) => [block.id, block]))
  const regex = new RegExp(SIMPLE_CONFLICT_BLOCK_RE.source, "g")
  let index = 0

  return content.replace(regex, (fullMatch) => {
    const block = appliedById.get(`conflict-${index++}`)

    if (!block?.autoApplied) {
      return fullMatch
    }

    return block.autoApplied.resolution
  })
}

function normalizeInput(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd()
}

export function computeConflictHash(
  filePath: string,
  base: string,
  ours: string,
  theirs: string
): string {
  const normalizedPayload = JSON.stringify({
    filePath: normalizeInput(filePath),
    base: normalizeInput(base),
    ours: normalizeInput(ours),
    theirs: normalizeInput(theirs),
  })

  return createHash("sha256").update(normalizedPayload).digest("hex")
}

export async function lookupRerere(
  conflictHash: string
): Promise<string | null> {
  const record = await prisma.conflictResolution.findUnique({
    where: { conflictHash },
    select: { resolution: true },
  })

  return record?.resolution ?? null
}

export async function storeRerere(
  filePath: string,
  base: string,
  ours: string,
  theirs: string,
  resolution: string
): Promise<void> {
  const conflictHash = computeConflictHash(filePath, base, ours, theirs)

  await prisma.conflictResolution.upsert({
    where: { conflictHash },
    create: {
      conflictHash,
      filePath,
      resolution,
    },
    update: {
      filePath,
      resolution,
    },
  })
}

export async function autoApplyRerere(blocks: ConflictBlock[]): Promise<{
  applied: ConflictBlock[]
  remaining: ConflictBlock[]
}> {
  const resolutions = await Promise.all(
    blocks.map(async (block) => ({
      block,
      resolution: await lookupRerere(
        computeConflictHash(
          block.filePath,
          block.base,
          block.ours,
          block.theirs
        )
      ),
    }))
  )

  const applied: ConflictBlock[] = []
  const remaining: ConflictBlock[] = []

  for (const { block, resolution } of resolutions) {
    if (resolution !== null) {
      applied.push({
        ...block,
        autoApplied: {
          resolution,
          source: "rerere",
        },
      })
      continue
    }

    remaining.push(block)
  }

  return { applied, remaining }
}
