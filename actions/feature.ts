"use server"

import { prisma as db } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const QQ_BOT_WEBHOOK = process.env.QQ_BOT_WEBHOOK || ""

async function sendQQBotNotification(payload: any) {
  if (!QQ_BOT_WEBHOOK) {
    console.log("[Mock QQ Bot] Would send payload to webhook: ", payload.text);
    return;
  }
  
  try {
    await fetch(QQ_BOT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send a structured payload that AstrBot can easily parse in a custom plugin
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Failed to send QQ Bot Notification:", error);
  }
}

export async function createFeature(data: { title: string, content: string, tags: string[] }) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const feature = await db.feature.create({
    data: {
      title: data.title,
      content: data.content,
      tags: data.tags,
      authorId: session.user.id
    },
    include: {
      author: true
    }
  })

  // Send structured payload for AstrBot
  await sendQQBotNotification({
    type: "new_feature",
    text: `New feature report from [${session.user.name || session.user.email}]: ${feature.title}\nID: ${feature.id}`,
    data: {
      id: feature.id,
      title: feature.title,
      author: session.user.name || session.user.email,
      tags: feature.tags,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/features/${feature.id}`
    }
  })

  revalidatePath("/features")
  return { success: true, feature }
}

export async function updateFeature(id: string, data: { title: string, content: string, tags: string[] }) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const feature = await db.feature.findUnique({ where: { id } })
  if (!feature) throw new Error("Not found")
  
  // We only allow authors or admins to edit, assuming everyone can view but author modifies
  if (feature.authorId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Forbidden")
  }

  const updated = await db.feature.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
      tags: data.tags
    }
  })

  revalidatePath("/features")
  revalidatePath(`/features/${id}`)
  return { success: true, feature: updated }
}

export async function updateFeatureExplanation(id: string, explanation: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const feature = await db.feature.findUnique({ where: { id } })
  if (!feature) throw new Error("Not found")

  // Assignee or Admin can update explanation
  if (feature.assigneeId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Forbidden")
  }

  const updated = await db.feature.update({
    where: { id },
    data: { explanation }
  })

  revalidatePath(`/features/${id}`)
  return { success: true, feature: updated }
}

export async function assignFeature(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const feature = await db.feature.update({
    where: { id },
    data: {
      status: "IN_PROGRESS",
      assigneeId: session.user.id
    }
  })

  revalidatePath("/features")
  revalidatePath(`/features/${id}`)
  return { success: true, feature }
}

export async function unassignFeature(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const feature = await db.feature.update({
    where: { id },
    data: {
      status: "PENDING",
      assigneeId: null
    }
  })

  revalidatePath("/features")
  revalidatePath(`/features/${id}`)
  return { success: true, feature }
}

export async function resolveFeature(id: string, resolutionComment?: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  if (session.user.role !== "ADMIN") throw new Error("Admin only")

  const feature = await db.feature.update({
    where: { id },
    data: {
      status: "RESOLVED"
    }
  })

  if (resolutionComment) {
    await db.featureComment.create({
      data: {
        content: `[Resolution]: ${resolutionComment}`,
        featureId: id,
        authorId: session.user.id
      }
    })
  }

  revalidatePath("/features")
  revalidatePath(`/features/${id}`)
  return { success: true, feature }
}

export async function addFeatureComment(id: string, content: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const feature = await db.feature.findUnique({ where: { id } })
  if (!feature) throw new Error("Not found")

  const comment = await db.featureComment.create({
    data: {
      content,
      featureId: id,
      authorId: session.user.id
    },
    include: {
      author: true
    }
  })

  revalidatePath(`/features/${id}`)
  return { success: true, comment }
}