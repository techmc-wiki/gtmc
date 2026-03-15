"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

export async function saveDraftAction(formData: FormData) {
  const session = await auth();

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const revisionId = formData.get("revisionId") as string | null;
  const articleId = formData.get("articleId") as string | null;
  const filePath = formData.get("filePath") as string | null;

  if (!title || !content) {
    throw new Error("Title and content are required");
  }

  let savedRevision;

  if (revisionId) {
    const existing = await prisma.revision.findUnique({
      where: { id: revisionId },
    });
    if (existing && (existing.status === "PENDING" || existing.status === "APPROVED")) {
      throw new Error("Cannot edit a draft that is pending or approved");
    }

    // Update existing draft
    savedRevision = await prisma.revision.update({
      where: { id: revisionId },
      data: {
        title,
        content,
        filePath,
        status: "DRAFT",
      },
    });
  } else {
    // Create new draft
    const createData: Prisma.RevisionCreateInput = {
      title,
      content,
      status: "DRAFT",
      author: { connect: { id: userId } },
    };
    if (articleId) {
      createData.article = { connect: { id: articleId } };
    }
    if (filePath) {
      createData.filePath = filePath;
    }
    savedRevision = await prisma.revision.create({
      data: createData,
    });
  }

  revalidatePath("/draft");
  return { success: true, revisionId: savedRevision.id };
}

export async function submitForReviewAction(revisionId: string) {
  if (!revisionId) {
    throw new Error("Revision ID is required");
  }
  const existing = await prisma.revision.findUnique({
    where: { id: revisionId },
  });
  if (existing && existing.status === "APPROVED") {
    throw new Error("Cannot submit an already approved draft");
  }
  // TODO: Session 验证

  await prisma.revision.update({
    where: { id: revisionId },
    data: {
      status: "PENDING",
    },
  });

  revalidatePath("/draft");
  revalidatePath("/review");
  return { success: true };
}

export async function deleteDraftAction(revisionId: string) {
  const session = await auth();

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const existing = await prisma.revision.findUnique({
    where: { id: revisionId },
  });

  if (!existing) {
    throw new Error("Draft not found");
  }

  if (existing.authorId !== userId) {
    throw new Error("Unauthorized to delete this draft");
  }

  if (existing.status === "PENDING" || existing.status === "APPROVED") {
    throw new Error("Cannot delete a pending or approved draft");
  }

  await prisma.revision.delete({
    where: { id: revisionId },
  });

  revalidatePath("/draft");
  return { success: true };
}
