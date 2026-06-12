"use server"

import { requireAuth } from "@/lib/auth/context"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { PATHS } from "@/lib/revalidate-paths"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  image: z.string().optional(),
})

export async function updateProfileAction(formData: FormData) {
  const session = await requireAuth()

  const raw = Object.fromEntries(formData)
  const validated = updateProfileSchema.safeParse(raw)

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { name, image } = validated.data

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      ...(image ? { image } : {}),
    },
  })

  revalidatePath(PATHS.PROFILE)
  revalidatePath(PATHS.HOME)
  redirect(PATHS.PROFILE)
}
