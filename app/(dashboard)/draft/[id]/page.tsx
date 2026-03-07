import { BrutalEditor } from "@/components/editor/brutal-editor";
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

  // Only DRAFT or REJECTED statuses should be editable usually
  // If it is PENDING or APPROVED, maybe we show it as read-only, 
  // but let's let them view it in the editor for now.

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-tech-main/30 pb-4 relative space-y-4 md:space-y-0">
        <div className="absolute -bottom-[5px] left-0 w-2 h-2 border border-tech-main/50 bg-tech-main/20"></div>
        <div className="flex items-center space-x-4 md:space-x-6">
          <Link href="/draft">
            <BrutalButton variant="ghost" size="sm">
              {"<"} BACK
            </BrutalButton>
          </Link>
          <h1 className="text-xl md:text-3xl font-mono uppercase tracking-[0.2em] text-tech-main">
            EDIT_SUBMISSION
          </h1>
        </div>
        <div className="text-xs font-mono border border-tech-main/50 bg-tech-main/10 text-tech-main px-3 py-1 uppercase tracking-widest">
          STATUS: [{draft.status}]
        </div>
      </div>

      <div className="bg-tech-main/5 border border-tech-main/30 p-6 mx-auto relative backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tech-main/50"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tech-main/50"></div>
        
        {draft.status === "PENDING" || draft.status === "APPROVED" ? (
           <div className="mb-4 bg-tech-main/20 border border-tech-main/50 p-4 font-mono text-sm text-tech-main-dark">
             // CAUTION: This revision is currently in [{draft.status}] state. Submitting changes will update it as a DRAFT.
           </div>
        ) : null}
        
        <BrutalEditor 
          initialData={{ 
            id: draft.id,
            title: draft.title, 
            content: draft.content, 
            filePath: draft.filePath || undefined,
            articleId: draft.articleId || undefined
          }} 
        />
      </div>
    </div>
  );
}
