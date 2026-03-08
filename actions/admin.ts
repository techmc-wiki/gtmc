"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function rejectRevisionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const revisionId = formData.get("revisionId") as string;
  if (!revisionId) throw new Error("Revision ID required");

  await prisma.revision.update({
    where: { id: revisionId },
    data: { status: "REJECTED" },
  });

  revalidatePath("/review");
  revalidatePath("/draft");
}

export async function approveRevisionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  const revisionId = formData.get("revisionId") as string;
  if (!revisionId) throw new Error("Revision ID required");

  if (!adminUser?.githubPat) {
    throw new Error("GitHub PAT not found. Please bind your PAT in your Profile Configuration first.");
  }

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
    include: { author: true },
  });

  if (!revision || revision.status !== "PENDING") {
    throw new Error("Invalid revision");
  }

  // 1. Mark as approved
  await prisma.revision.update({
    where: { id: revisionId },
    data: { 
      status: "APPROVED",
      reviewerId: session.user.id 
    },
  });

  // 2. Trigger GitHub Action to create PR
  try {
    const githubToken = adminUser.githubPat;
    const repoOwner = process.env.GITHUB_REPO_OWNER; 
    const repoName = process.env.GITHUB_REPO_NAME;

    if (githubToken && repoOwner && repoName) {
      const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/submit_pr.yml/dispatches`, {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `token ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            submitterName: revision.author?.name || revision.author?.email || "Unknown User",
            reviewerName: session.user.name || "Admin",
            filePath: revision.filePath || `${revision.title.replace(/ /g, '-')}.md`,
            content: revision.content,
            title: revision.title,
          }
        }),
      });

      if (!response.ok) {
         console.error("Failed to trigger GitHub Action:", await response.text());
      }
    } else {
      console.warn("GitHub PAT or Repo details missing, could not trigger PR creation.");
    }
  } catch (e) {
    console.error("Error triggering GH action", e);
  }

  revalidatePath("/review");
  revalidatePath("/draft");
}
