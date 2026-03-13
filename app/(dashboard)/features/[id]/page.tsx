import { auth } from "@/lib/auth";
import {
  EXPLANATION_MARKER,
  labelsToStatus,
  labelsToTags,
  listAllIssues,
  listIssueComments,
  parseCommentBody,
  parseIssueBody,
} from "@/lib/github-features";
import { FeatureEditor } from "@/components/editor/feature-editor";
import { notFound } from "next/navigation";
import { BrutalCard } from "@/components/ui/brutal-card";
import { FeatureActions } from "./feature-actions";
import { FeatureComments } from "./feature-comments";
import { FeatureExplanation } from "./feature-explanation";

export const revalidate = 60;

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const localIndex = Number.parseInt(id, 10);
  if (Number.isNaN(localIndex) || localIndex < 0) {
    notFound();
  }

  const session = await auth();

  const allIssues = await listAllIssues("all");
  allIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const issue = allIssues[localIndex];
  if (!issue) {
    notFound();
  }

  const parsedIssue = parseIssueBody(issue.body);
  const rawComments = await listIssueComments(issue.number);

  const comments = rawComments
    .filter((comment) => !comment.body.includes(EXPLANATION_MARKER))
    .map((comment) => {
      const parsedComment = parseCommentBody(comment.body);
      return {
        id: String(comment.id),
        content: parsedComment.content,
        createdAt: new Date(comment.createdAt),
        author: {
          name: parsedComment.metadata?.authorName ?? null,
          email: parsedComment.metadata?.authorEmail ?? null,
          image: null,
        },
      };
    });

  const feature = {
    id: String(localIndex),
    title: issue.title,
    status: labelsToStatus(issue.labels),
    tags: labelsToTags(issue.labels),
    createdAt: new Date(issue.createdAt),
    content: parsedIssue.userContent,
    explanation: parsedIssue.explanation,
    authorId: parsedIssue.metadata?.appUserId ?? "",
    assigneeId: parsedIssue.metadata?.assigneeId ?? null,
    author: {
      name: parsedIssue.metadata?.authorName ?? null,
      email: parsedIssue.metadata?.authorEmail ?? null,
      image: null,
    },
    assignee: parsedIssue.metadata?.assigneeId
      ? {
          name: parsedIssue.metadata?.assigneeName ?? null,
          email: parsedIssue.metadata?.assigneeEmail ?? null,
          image: null,
        }
      : null,
    comments,
  };

  const isAuthor = session?.user?.id === feature.authorId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isAssignee = session?.user?.id === feature.assigneeId;

  const canEdit = isAuthor || isAdmin;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase border-b-2 border-tech-main pb-2 pr-8 inline-block">
            {canEdit ? "Edit Feature" : "View Feature"}
          </h1>
          <p className="text-sm mt-2 font-mono text-zinc-600">
            ID: {feature.id}
          </p>
        </div>

        {/* Status Actions for logged in users */}
        {session?.user && (
          <FeatureActions
            featureId={feature.id}
            status={feature.status}
            isAssignee={isAssignee}
            isAdmin={isAdmin}
            hasAssignee={!!feature.assigneeId}
          />
        )}
      </div>

      <BrutalCard className="mb-8">
        <div className="flex flex-col gap-2 font-mono text-sm">
          <div className="flex gap-2 items-center">
            <span className="font-bold text-zinc-500 w-24">STATUS:</span>
            <StatusBadge status={feature.status} />
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-zinc-500 w-24">AUTHOR:</span>
            <span>
              {feature.author.name || feature.author.email || "Unknown"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-zinc-500 w-24">ASSIGNEE:</span>
            <span>
              {feature.assignee
                ? feature.assignee.name || feature.assignee.email
                : "Unassigned"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-zinc-500 w-24">CREATED:</span>
            <span suppressHydrationWarning>
              {new Date(feature.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      </BrutalCard>

      <FeatureExplanation
        featureId={feature.id}
        initialExplanation={feature.explanation}
        isAssignee={isAssignee}
        isAdmin={isAdmin}
      />

      <div className="pt-4">
        {canEdit ? (
          <FeatureEditor
            initialData={{
              id: feature.id,
              title: feature.title,
              content: feature.content,
              tags: feature.tags,
              status: feature.status,
            }}
          />
        ) : (
          <BrutalCard>
            <h2 className="text-2xl font-bold mb-4">{feature.title}</h2>

            {feature.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {feature.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono uppercase border border-tech-main text-tech-main bg-tech-accent/10 px-2 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose prose-zinc max-w-none mt-8 border-t border-dashed border-tech-main/30 pt-6">
              {/* Very simple non-editable view, actual MD rendering could be added here */}
              <div className="whitespace-pre-wrap font-mono text-sm">
                {feature.content}
              </div>
            </div>
          </BrutalCard>
        )}
      </div>

      <FeatureComments
        featureId={feature.id}
        initialComments={feature.comments}
        userId={session?.user?.id}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let styles = "px-2 py-1 text-xs font-bold uppercase border";
  let label = status;

  switch (status) {
    case "PENDING":
      styles += " bg-yellow-100 border-yellow-400 text-yellow-800";
      label = "待解决";
      break;
    case "IN_PROGRESS":
      styles += " bg-blue-100 border-blue-400 text-blue-800";
      label = "解决中";
      break;
    case "RESOLVED":
      styles += " bg-green-100 border-green-400 text-green-800";
      label = "已解决";
      break;
    default:
      styles += " bg-zinc-100 border-zinc-300 text-zinc-600";
  }

  return <span className={styles}>{label}</span>;
}
