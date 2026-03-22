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
  const githubPat = formData.get("githubPat") as string

  if (!name || name.trim() === "") {
    throw new Error("Name is required")
  }

  // Find user to check role, so we only update githubPat if they are actually an admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      ...(image ? { image } : {}),
      ...(user?.role === "ADMIN" && typeof githubPat === "string"
        ? { githubPat: githubPat || null }
        : {}),
    },
  })

  revalidatePath("/profile")
  revalidatePath("/")
  redirect("/profile")
}
