import { BrutalEditor } from "@/components/editor/brutal-editor";
import Link from "next/link";
import { BrutalButton } from "@/components/ui/brutal-button";
import { getRepoFileContent } from "@/lib/github-pr";

export default async function NewDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { file: fileParam } = await searchParams;
  const filePath = typeof fileParam === "string" ? fileParam : undefined;

  let initialTitle = "UNTITLED";
  let initialContent = "";

  if (filePath) {
    initialTitle = filePath;
    // Read initial content from Articles repo instead of local assets filesystem.
    const normalizedPath = filePath.replace(/^\/+/, "");
    const candidates = normalizedPath.endsWith(".md")
      ? [normalizedPath]
      : [normalizedPath, `${normalizedPath}.md`];

    for (const candidate of candidates) {
      const content = await getRepoFileContent(candidate);
      if (content !== null) {
        initialContent = content;
        break;
      }
    }

    if (!initialContent) {
      initialContent = `Failed to load file at ${filePath}.`;
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div className="border-tech-main/40 relative flex items-center space-x-6 border-b pb-4">
        <div className="border-tech-main/40 bg-tech-main/10 absolute -bottom-[5px] left-0 h-2 w-2 border"></div>
        <Link href="/draft">
          <BrutalButton variant="ghost" size="sm">
            {"<"} BACK
          </BrutalButton>
        </Link>
        <h1 className="text-tech-main tracking-tech-wide font-mono text-xl uppercase md:text-3xl">
          NEW_SUBMISSION
        </h1>
      </div>

      <div className="bg-tech-main/5 border-tech-main/40 relative mx-auto border p-6 backdrop-blur-sm">
        <div className="border-tech-main/40 absolute top-0 left-0 h-2 w-2 border-t border-l"></div>
        <div className="border-tech-main/40 absolute right-0 bottom-0 h-2 w-2 border-r border-b"></div>
        <BrutalEditor
          initialData={{
            title: initialTitle,
            content: initialContent,
            filePath,
          }}
        />
      </div>
    </div>
  );
}
