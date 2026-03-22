"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { PATHS } from "@/lib/cache-config"

export async function updateProfileAction(formData: FormData) {
  const session = await requireAuth()

  const name = formData.get("name") as string
  const image = formData.get("image") as string

  if (!name || name.trim() === "") {
    throw new Error("Name is required")
  }

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
