"use server"

import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { requireAuth } from "@/lib/auth/context"
import { prisma } from "@/lib/prisma"

const operationsSchema = z.array(z.record(z.string(), z.unknown()))

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
  operations: unknown[],
  title?: string
): Promise<{
  success: boolean
  errors?: { operations?: string[]; general?: string }
}> {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const validated = operationsSchema.safeParse(operations)
    if (!validated.success) {
      return {
        success: false,
        errors: { operations: validated.error.issues.map((i) => i.message) },
      }
    }

    const existing = await prisma.glossaryRevision.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, errors: { general: "Draft not found" } }
    }
    if (existing.authorId !== userId) {
      return { success: false, errors: { general: "Unauthorized" } }
    }
    if (existing.status !== "DRAFT") {
      return {
        success: false,
        errors: {
          general: "Cannot edit a draft after submission has started",
        },
      }
    }

    await prisma.glossaryRevision.update({
      where: { id },
      data: {
        operations: validated.data as Prisma.InputJsonValue,
        ...(title !== undefined ? { title: title.trim() || null } : {}),
      },
    })

    try {
      revalidatePath("/draft")
    } catch {
      // ignore revalidation error during background save
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed"
    return { success: false, errors: { general: message } }
  }
}

export async function deleteGlossaryDraftAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const existing = await prisma.glossaryRevision.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Draft not found" }
    if (existing.authorId !== userId) {
      return { success: false, error: "Unauthorized" }
    }
    if (existing.status !== "DRAFT") {
      return {
        success: false,
        error: "Cannot delete a draft that has already been submitted",
      }
    }

    await prisma.glossaryRevision.delete({ where: { id } })

    try {
      revalidatePath("/draft")
    } catch {
      // ignore
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed"
    return { success: false, error: message }
  }
}
