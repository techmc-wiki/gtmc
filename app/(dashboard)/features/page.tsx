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
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl">
      <RevealSection delay={0}>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tighter uppercase border-b-2 border-tech-main pb-2 inline-block">
              Feature Reports
            </h1>
            <p className="text-xs sm:text-sm mt-2 font-mono text-zinc-600">
              Bug reports, feature requests, and issue tracking.
            </p>
          </div>

          {session?.user && (
            <Link href="/features/new" passHref className="w-full sm:w-auto">
              <BrutalButton variant="primary" className="w-full sm:w-auto min-h-[44px]">
                REPORT NEW FEATURE
              </BrutalButton>
            </Link>
          )}
        </div>

        {isCreated && <PendingCreationBanner />}
      </RevealSection>

      <RevealSection delay={100}>
        <div className="mt-8 pt-4">
          <FeatureList features={features} />
        </div>
      </RevealSection>
    </div>
  );
}
