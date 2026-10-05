"use server"

import { requireAuth } from "@/lib/auth/context"
import { profileSchema, writeProfile } from "@/lib/auth/profile"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateProfileAction(formData: FormData) {
  const session = await requireAuth()

  const raw = Object.fromEntries(formData)
  const validated = profileSchema.safeParse(raw)

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  await writeProfile(session.user.id, validated.data)

  revalidatePath("/profile")
  revalidatePath("/")
  redirect("/profile")
}
