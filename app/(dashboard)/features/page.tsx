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
    <div className="max-w-6xl mx-auto space-y-8 px-6 pb-12">
      <RevealSection delay={0}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-tech-main/40 pb-6 relative gap-4 mt-8">
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-tech-main/20 -translate-y-[1px] translate-x-[1px]"></div>
          <div className="mb-0 w-full md:w-auto">
            <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-tight text-tech-main-dark flex items-center gap-2">
              <span className="w-3 h-3 bg-tech-main/20 border border-tech-main/40 flex-shrink-0"></span>
              <span className="break-words">Feature Reports</span>
            </h1>
            <p className="text-xs sm:text-sm font-mono tracking-widest mt-3 text-tech-main/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-main flex-shrink-0 animate-pulse"></span>
              <span className="break-words">BUG REPORTS, FEATURE REQUESTS, AND ISSUE TRACKING</span>
            </p>
          </div>

          {session?.user && (
            <Link href="/features/new" className="w-full md:w-auto">
              <BrutalButton
                variant="primary"
                className="uppercase text-xs tracking-widest px-6 flex items-center justify-center hover:scale-[1.02] transition-transform w-full md:w-auto min-h-[44px]"
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
