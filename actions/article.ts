"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  getMainBranchHeadSha,
  openDraftPullRequest,
} from "@/lib/article-submission";
import { getGitHubWriteToken } from "@/lib/github-pr";
import { prisma } from "@/lib/prisma";

const EDITABLE_STATUSES = new Set(["DRAFT"]);

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
  const token = (session.user as { githubPat?: string }).githubPat || process.env.GITHUB_TOKEN;

  if (!title || !content) {
    throw new Error("Title and content are required");
  }

  let savedRevision;

  if (revisionId) {
    const existing = await prisma.revision.findUnique({
      where: { id: revisionId },
    });

    if (!existing) {
      throw new Error("Draft not found");
    }

    if (existing.authorId !== userId) {
      throw new Error("Unauthorized");
    }

    if (!EDITABLE_STATUSES.has(existing.status)) {
      throw new Error("Cannot edit a draft that is already in review");
    }

    savedRevision = await prisma.revision.update({
      where: { id: revisionId },
      data: {
        articleId: articleId || existing.articleId,
        conflictContent: existing.status === "SYNC_CONFLICT" ? content : existing.conflictContent,
        content: existing.status === "SYNC_CONFLICT" ? existing.content : content,
        filePath: filePath || null,
        title,
      },
    });
  } else {
    const baseMainSha = await getMainBranchHeadSha(token);
    const createData: Prisma.RevisionCreateInput = {
      baseMainSha,
      content,
      filePath: filePath || undefined,
      status: "DRAFT",
      syncedMainSha: baseMainSha,
      title,
      author: { connect: { id: userId } },
    };

    if (articleId) {
      createData.article = { connect: { id: articleId } };
    }

    savedRevision = await prisma.revision.create({
      data: createData,
    });
  }

  revalidatePath("/draft");
  return { success: true, revisionId: savedRevision.id };
}

export async function submitForReviewAction(revisionId: string) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  if (!revisionId) {
    throw new Error("Revision ID is required");
  }
  
  const existing = await prisma.revision.findUnique({
    where: { id: revisionId },
    include: { author: true },
  });

  if (!existing) {
    throw new Error("Revision not found");
  }

  if (existing.authorId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  if (existing.status !== "DRAFT") {
    throw new Error("Only a draft can open a PR");
  }

  if (!existing.filePath) {
    throw new Error("File path is required. Please specify the target file path in editor.");
  }

  const token = getGitHubWriteToken(existing.author.githubPat);
  const authorName = session.user.name || "GTMC Author";
  const authorEmail = session.user.email || "author@gtmc.dev";
  const baseMainSha = existing.baseMainSha || (await getMainBranchHeadSha(token));

  if (!token) {
    throw new Error("Failed to create PR: missing GITHUB_ARTICLES_WRITE_PAT or another token with repo write permission.");
  }

  try {
    const result = await openDraftPullRequest({
      authorEmail,
      title: existing.title,
      content: existing.content,
      filePath: existing.filePath,
      baseMainSha,
      authorName,
      draftId: existing.id,
      token,
    });

    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        baseMainSha,
        conflictContent: result.conflictContent,
        content: result.content,
        filePath: result.filePath,
        githubPrNum: result.prNumber,
        githubPrUrl: result.prUrl,
        prBranchName: result.branchName,
        status: result.status,
        submittedAt: new Date(),
        syncedMainSha: result.syncedMainSha,
      },
    });

    revalidatePath("/draft");
    revalidatePath("/review");
    return { success: true, status: result.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Resource not accessible by personal access token")) {
      throw new Error("Failed to create PR: the configured GitHub token cannot create branches in the Articles repo. Set GITHUB_ARTICLES_WRITE_PAT with repo write access on Vercel.");
    }
    throw new Error(`Failed to create PR: ${message}`);
  }
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

  if (existing.githubPrNum || existing.status === "IN_REVIEW" || existing.status === "SYNC_CONFLICT") {
    throw new Error("Cannot delete a draft after a PR has been opened");
  }

  await prisma.revision.delete({
    where: { id: revisionId },
  });

  revalidatePath("/draft");
  return { success: true };
}
