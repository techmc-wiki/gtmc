import { auth } from "@/lib/auth";
import { labelsToStatus, labelsToTags, listAllIssues, parseIssueBody } from "@/lib/github-features";
import Link from "next/link";
import { BrutalButton } from "@/components/ui/brutal-button";
import { FeatureList } from "./feature-list";
import { PendingCreationBanner } from "./pending-creation-banner";
import { RevealSection } from "./reveal-helpers";

export const revalidate = 60;

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const isCreated = params?.created === "true";

  const allIssues = await listAllIssues();
  allIssues.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const features = allIssues.map((issue) => {
    const parsed = parseIssueBody(issue.body);
    const assigneeId = parsed.metadata?.assigneeId;

    return {
      id: String(issue.number),
      title: issue.title,
      status: labelsToStatus(issue.labels),
      tags: labelsToTags(issue.labels),
      createdAt: new Date(issue.createdAt),
      author: {
        name: parsed.metadata?.authorName || undefined,
        email: parsed.metadata?.authorEmail || undefined,
        image: undefined,
      },
      assignee: assigneeId
        ? {
            name: parsed.metadata?.assigneeName || undefined,
            email: parsed.metadata?.assigneeEmail || undefined,
            image: undefined,
          }
        : undefined,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 pb-12">
      <RevealSection delay={0}>
        <div className="border-tech-main/40 relative mt-8 flex flex-col items-start justify-between gap-4 border-b pb-6 md:flex-row md:items-end">
          <div className="border-tech-main/20 absolute top-0 right-0 h-8 w-8 translate-x-[1px] -translate-y-[1px] border-t border-r"></div>
          <div className="mb-0 w-full md:w-auto">
            <h1 className="text-tech-main-dark flex items-center gap-2 text-2xl font-bold tracking-tight uppercase md:text-4xl">
              <span className="bg-tech-main/20 border-tech-main/40 h-3 w-3 shrink-0 border"></span>
              <span className="break-words">Feature Reports</span>
            </h1>
            <p className="text-tech-main/80 mt-3 flex items-center gap-2 font-mono text-xs tracking-widest sm:text-sm">
              <span className="bg-tech-main h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"></span>
              <span className="break-words">BUG REPORTS, FEATURE REQUESTS, AND ISSUE TRACKING</span>
            </p>
          </div>

          {session?.user && (
            <Link href="/features/new" className="w-full md:w-auto">
              <BrutalButton
                variant="primary"
                className="flex min-h-[44px] w-full items-center justify-center px-6 text-xs tracking-widest uppercase transition-transform hover:scale-[1.02] md:w-auto"
              >
                + REPORT NEW FEATURE
              </BrutalButton>
            </Link>
          )}
        </div>

        {isCreated && <PendingCreationBanner />}
      </RevealSection>

      <RevealSection delay={100}>
        <div className="mt-8">
          <FeatureList features={features} />
        </div>
      </RevealSection>
    </div>
  );
}
