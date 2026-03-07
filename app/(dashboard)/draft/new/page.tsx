import { BrutalEditor } from "@/components/editor/brutal-editor";
import Link from "next/link";
import { BrutalButton } from "@/components/ui/brutal-button";
import fs from "fs";
import path from "path";

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
    try {
      const fullPath = path.join(process.cwd(), "assets", filePath);
      if (fullPath.startsWith(path.join(process.cwd(), "assets"))) {
        initialContent = fs.readFileSync(fullPath, "utf-8");
      }
    } catch (e) {
      initialContent = `Failed to load file at ${filePath}.`;
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center space-x-6 border-b border-tech-main/30 pb-4 relative">
        <div className="absolute -bottom-[5px] left-0 w-2 h-2 border border-tech-main/50 bg-tech-main/20"></div>
        <Link href="/draft">
          <BrutalButton variant="ghost" size="sm">
            {"<"} BACK
          </BrutalButton>
        </Link>
        <h1 className="text-xl md:text-3xl font-mono uppercase tracking-[0.2em] text-tech-main">
          NEW_SUBMISSION
        </h1>
      </div>

      <div className="bg-tech-main/5 border border-tech-main/30 p-6 mx-auto relative backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tech-main/50"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tech-main/50"></div>
        <BrutalEditor initialData={{ title: initialTitle, content: initialContent, filePath }} />
      </div>
    </div>
  );
}
