"use server"

import { revalidatePath } from "next/cache"
import type { GlossaryRevision } from "@prisma/client"
import { Prisma } from "@prisma/client"

import { requireAuth } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

export async function createGlossaryDraftAction(): Promise<{ id: string }> {
  const session = await requireAuth()
  const userId = session.user.id

  const revision = await prisma.glossaryRevision.create({
    data: {
      authorId: userId,
      status: "DRAFT",
      operations: [],
      baseSubmoduleSha: null,
    },
  })

  revalidatePath("/draft")
  return { id: revision.id }
}

export async function updateGlossaryDraftAction(
  id: string,
  operations: unknown[]
): Promise<void> {
  const session = await requireAuth()
  const userId = session.user.id

  const existing = await prisma.glossaryRevision.findUnique({ where: { id } })
  if (!existing) throw new Error("Draft not found")
  if (existing.authorId !== userId) throw new Error("Unauthorized")
  if (existing.status !== "DRAFT")
    throw new Error("Cannot edit a draft that is already in review")

  await prisma.glossaryRevision.update({
    where: { id },
    data: { operations: operations as Prisma.InputJsonValue },
  })

  revalidatePath("/draft")
}

export async function deleteGlossaryDraftAction(id: string): Promise<void> {
  const session = await requireAuth()
  const userId = session.user.id

  const existing = await prisma.glossaryRevision.findUnique({ where: { id } })
  if (!existing) throw new Error("Draft not found")
  if (existing.authorId !== userId) throw new Error("Unauthorized")
  if (existing.status !== "DRAFT")
    throw new Error("Cannot delete a draft that is already in review")

  await prisma.glossaryRevision.delete({ where: { id } })

  revalidatePath("/draft")
}

export async function loadGlossaryDraftAction(
  id: string
): Promise<GlossaryRevision> {
  const session = await requireAuth()
  const userId = session.user.id

  const existing = await prisma.glossaryRevision.findUnique({ where: { id } })
  if (!existing) throw new Error("Draft not found")
  if (existing.authorId !== userId) throw new Error("Unauthorized")

  return existing
}
