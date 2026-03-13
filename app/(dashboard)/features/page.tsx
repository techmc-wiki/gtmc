import { auth } from "@/lib/auth";
import {
  labelsToStatus,
  labelsToTags,
  listAllIssues,
  parseIssueBody,
} from "@/lib/github-features";
import Link from "next/link";
import { BrutalButton } from "@/components/ui/brutal-button";
import { FeatureList } from "./feature-list";

export const revalidate = 60;

export default async function FeaturesPage() {
  const session = await auth();

  const allIssues = await listAllIssues("all");
  allIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const features = allIssues.map((issue, index) => {
    const parsed = parseIssueBody(issue.body);
    const assigneeId = parsed.metadata?.assigneeId;

    return {
      id: String(index),
      title: issue.title,
      status: labelsToStatus(issue.labels),
      tags: labelsToTags(issue.labels),
      createdAt: new Date(issue.createdAt),
      author: {
        name: parsed.metadata?.authorName ?? null,
        email: parsed.metadata?.authorEmail ?? null,
        image: null,
      },
      assignee: assigneeId
        ? {
            name: parsed.metadata?.assigneeName ?? null,
            email: parsed.metadata?.assigneeEmail ?? null,
            image: null,
          }
        : null,
    };
  });

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase border-b-2 border-tech-main pb-2 pr-8 inline-block">
            Feature Reports
          </h1>
          <p className="text-sm mt-2 font-mono text-zinc-600">
            Bug reports, feature requests, and issue tracking.
          </p>
        </div>

        {session?.user && (
          <Link href="/features/new" passHref>
            <BrutalButton variant="primary">REPORT NEW FEATURE</BrutalButton>
          </Link>
        )}
      </div>

      <div className="mt-8 pt-4">
        <FeatureList features={features} />
      </div>
    </div>
  );
}
