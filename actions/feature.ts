"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  listAllIssues,
  addIssueComment,
  createIssue,
  updateIssue,
  setIssueLabels,
  setIssueState,
  setIssueAssignees,
  parseIssueBody,
  serializeIssueBody,
  serializeCommentBody,
  ensureLabel,
  tagsToLabels,
  statusToLabels,
  labelsToStatus,
  labelsToTags,
  type IssueMetadata,
} from "@/lib/github-features";

const QQ_BOT_WEBHOOK = process.env.QQ_BOT_WEBHOOK || "";

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
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to send QQ Bot Notification:", error);
  }
}

async function getIssueNumberByIndex(localIndex: number): Promise<number> {
  const allIssues = await listAllIssues("all");
  allIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const issue = allIssues[localIndex];
  if (!issue) throw new Error("Not found");
  return issue.number;
}

async function getFeatureByIndex(localIndex: number) {
  const allIssues = await listAllIssues("all");
  allIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const issue = allIssues[localIndex];
  if (!issue) return null;
  const parsed = parseIssueBody(issue.body);
  return { issue, parsed };
}

export async function createFeature(data: {
  title: string;
  content: string;
  tags: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const metadata: IssueMetadata = {
    appUserId: session.user.id,
    authorName: session.user.name ?? null,
    authorEmail: session.user.email ?? null,
  };

  const body = serializeIssueBody(data.content, metadata, undefined);

  // Ensure all tag labels exist on the repo
  for (const tag of data.tags) {
    await ensureLabel(tag);
  }

  const labels = [...tagsToLabels(data.tags), ...statusToLabels("PENDING")];

  const created = await createIssue(data.title, body, labels);

  // Determine local index: fetch all issues, sort by createdAt ASC, find position
  const allIssues = await listAllIssues("all");
  allIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const localIndex = allIssues.findIndex((i) => i.number === created.number);

  // Send structured payload for AstrBot
  await sendQQBotNotification({
    type: "new_feature",
    text: `New feature report from [${session.user.name || session.user.email}]: ${data.title}\nID: ${localIndex}`,
    data: {
      id: String(localIndex),
      title: data.title,
      author: session.user.name || session.user.email,
      tags: data.tags,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/features/${localIndex}`,
    },
  });

  revalidatePath("/features");
  return {
    success: true,
    feature: {
      id: String(localIndex),
      title: data.title,
      content: data.content,
      tags: data.tags,
    },
  };
}

export async function updateFeature(
  id: string,
  data: { title: string; content: string; tags: string[] },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const localIndex = parseInt(id, 10);
  if (isNaN(localIndex)) throw new Error("Invalid feature ID");

  const feature = await getFeatureByIndex(localIndex);
  if (!feature) throw new Error("Not found");

  const { issue, parsed } = feature;

  if (
    parsed.metadata?.appUserId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    throw new Error("Forbidden");
  }

  for (const tag of data.tags) {
    await ensureLabel(tag);
  }

  const currentStatus = labelsToStatus(issue.labels);
  const newLabels = [
    ...tagsToLabels(data.tags),
    ...statusToLabels(currentStatus),
  ];

  const fallbackMetadata: IssueMetadata = {
    appUserId: "",
    authorName: null,
    authorEmail: null,
  };
  const newBody = serializeIssueBody(
    data.content,
    parsed.metadata ?? fallbackMetadata,
    parsed.explanation ?? undefined,
  );

  await updateIssue(issue.number, {
    title: data.title,
    body: newBody,
    labels: newLabels,
  });

  revalidatePath("/features");
  revalidatePath(`/features/${id}`);
  return {
    success: true,
    feature: {
      id,
      title: data.title,
      content: data.content,
      tags: data.tags,
    },
  };
}

export async function updateFeatureExplanation(
  id: string,
  explanation: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const localIndex = parseInt(id, 10);
  if (isNaN(localIndex)) throw new Error("Invalid feature ID");

  const feature = await getFeatureByIndex(localIndex);
  if (!feature) throw new Error("Not found");

  const { issue, parsed } = feature;

  const isAdmin = session.user.role === "ADMIN";
  const isAssignee = parsed.metadata?.assigneeId === session.user.id;
  if (!isAssignee && !isAdmin) throw new Error("Forbidden");

  const newBody = serializeIssueBody(
    parsed.userContent,
    parsed.metadata ?? { appUserId: "", authorName: null, authorEmail: null },
    explanation || undefined,
  );

  await updateIssue(issue.number, { body: newBody });

  revalidatePath(`/features/${id}`);
  return { success: true };
}

export async function assignFeature(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const localIndex = parseInt(id, 10);
  if (isNaN(localIndex)) throw new Error("Invalid feature ID");

  const feature = await getFeatureByIndex(localIndex);
  if (!feature) throw new Error("Not found");

  const { issue, parsed } = feature;

  const newBodyWithAssignee = serializeIssueBody(
    parsed.userContent,
    {
      appUserId: parsed.metadata?.appUserId ?? "",
      authorName: parsed.metadata?.authorName ?? null,
      authorEmail: parsed.metadata?.authorEmail ?? null,
      assigneeId: session.user.id,
      assigneeName: session.user.name ?? null,
      assigneeEmail: session.user.email ?? null,
    },
    parsed.explanation ?? undefined,
  );

  const tags = labelsToTags(issue.labels);
  const newLabels = [...tagsToLabels(tags), ...statusToLabels("IN_PROGRESS")];

  await Promise.all([
    setIssueLabels(issue.number, newLabels),
    updateIssue(issue.number, { body: newBodyWithAssignee }),
  ]);

  if (session.user.name) {
    try {
      await setIssueAssignees(issue.number, [session.user.name]);
    } catch (error) {
      console.warn("Failed to sync GitHub assignee:", error);
    }
  }

  revalidatePath("/features");
  revalidatePath(`/features/${id}`);
  return { success: true, feature: { id } };
}

export async function unassignFeature(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const localIndex = parseInt(id, 10);
  if (isNaN(localIndex)) throw new Error("Invalid feature ID");

  const feature = await getFeatureByIndex(localIndex);
  if (!feature) throw new Error("Not found");

  const { issue, parsed } = feature;

  const newBody = serializeIssueBody(
    parsed.userContent,
    {
      appUserId: parsed.metadata?.appUserId ?? "",
      authorName: parsed.metadata?.authorName ?? null,
      authorEmail: parsed.metadata?.authorEmail ?? null,
    },
    parsed.explanation ?? undefined,
  );

  const tags = labelsToTags(issue.labels);
  const newLabels = [...tagsToLabels(tags), ...statusToLabels("PENDING")];

  await Promise.all([
    setIssueLabels(issue.number, newLabels),
    updateIssue(issue.number, { body: newBody }),
  ]);

  try {
    await setIssueAssignees(issue.number, []);
  } catch (error) {
    console.warn("Failed to clear GitHub assignees:", error);
  }

  revalidatePath("/features");
  revalidatePath(`/features/${id}`);
  return { success: true, feature: { id } };
}

export async function resolveFeature(id: string, resolutionComment?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const localIndex = parseInt(id, 10);
  if (isNaN(localIndex)) throw new Error("Invalid feature ID");

  if (session.user.role !== "ADMIN") throw new Error("Admin only");

  const feature = await getFeatureByIndex(localIndex);
  if (!feature) throw new Error("Not found");

  const { issue } = feature;

  const tags = labelsToTags(issue.labels);
  const newLabels = [...tagsToLabels(tags), ...statusToLabels("RESOLVED")];

  await setIssueLabels(issue.number, newLabels);
  await setIssueState(issue.number, "closed");

  if (resolutionComment) {
    await addIssueComment(
      issue.number,
      serializeCommentBody(`[Resolution]: ${resolutionComment}`, {
        appUserId: session.user.id,
        authorName: session.user.name ?? null,
        authorEmail: session.user.email ?? null,
      }),
    );
  }

  revalidatePath("/features");
  revalidatePath(`/features/${id}`);
  return { success: true, feature: { id } };
}

export async function addFeatureComment(id: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const localIndex = parseInt(id, 10);
  if (isNaN(localIndex)) throw new Error("Invalid feature ID");

  const feature = await getFeatureByIndex(localIndex);
  if (!feature) throw new Error("Not found");

  const commentBody = serializeCommentBody(content, {
    appUserId: session.user.id,
    authorName: session.user.name ?? null,
    authorEmail: session.user.email ?? null,
  });

  const ghComment = await addIssueComment(feature.issue.number, commentBody);

  revalidatePath(`/features/${id}`);

  return {
    success: true,
    comment: {
      id: String(ghComment.id),
      content,
      createdAt: new Date(ghComment.createdAt),
      author: {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: (session.user as any).image ?? null,
      },
    },
  };
}
