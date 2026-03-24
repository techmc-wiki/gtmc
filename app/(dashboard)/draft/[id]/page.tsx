import { DraftEditor } from "@/components/editor/draft-editor";
import Link from "next/link";
import { BrutalButton } from "@/components/ui/brutal-button";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function EditDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  const draft = await prisma.revision.findUnique({
    where: { id },
  });

  if (!draft || draft.authorId !== session.user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div className="border-tech-main/30 relative flex flex-col items-start justify-between space-y-4 border-b pb-4 md:flex-row md:items-end md:space-y-0">
        <div className="border-tech-main/50 bg-tech-main/20 absolute -bottom-[5px] left-0 h-2 w-2 border"></div>
        <div className="flex items-center space-x-4 md:space-x-6">
          <Link href="/draft">
            <BrutalButton variant="ghost" size="sm">
              {"<"} BACK
            </BrutalButton>
          </Link>
          <h1 className="text-tech-main tracking-tech-wide font-mono text-xl uppercase md:text-3xl">
            EDIT_SUBMISSION
          </h1>
        </div>
        <div className="border-tech-main/50 bg-tech-main/10 text-tech-main border px-3 py-1 font-mono text-xs tracking-widest uppercase">
          STATUS: [{draft.status}]
        </div>
      </div>

      <div className="bg-tech-main/5 border-tech-main/30 relative mx-auto border p-6 backdrop-blur-sm">
        <div className="border-tech-main/50 absolute top-0 left-0 h-2 w-2 border-t border-l"></div>
        <div className="border-tech-main/50 absolute right-0 bottom-0 h-2 w-2 border-r border-b"></div>

        {draft.status === "IN_REVIEW" ? (
          <div className="bg-tech-main/20 border-tech-main/50 text-tech-main-dark mb-4 border p-4 font-mono text-sm">
            {`// CAUTION: This draft is already in review. The PR branch is now the source of truth until review completes.`}
          </div>
        ) : null}

        {draft.status === "SYNC_CONFLICT" ? (
          <div className="mb-4 border border-amber-500/50 bg-amber-500/10 p-4 font-mono text-sm text-amber-700">
            {`// LATEST MAIN COULD NOT BE APPLIED CLEANLY. This draft is locked until an admin resolves the conflict from the review page.`}
          </div>
        ) : null}

        <DraftEditor
          initialData={{
            conflictContent: draft.conflictContent || undefined,
            id: draft.id,
            title: draft.title,
            content: draft.content,
            filePath: draft.filePath || undefined,
            githubPrUrl: draft.githubPrUrl || undefined,
            articleId: draft.articleId || undefined,
            status: draft.status,
          }}
        />
      </div>
    </div>
  );
}
