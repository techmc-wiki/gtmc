"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateProfileAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

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

  revalidatePath("/profile")
  revalidatePath("/")
  redirect("/profile")
}
