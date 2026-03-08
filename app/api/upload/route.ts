import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentPath = formData.get("filePath") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!documentPath) {
      return NextResponse.json({ error: "No document path provided" }, { status: 400 });
    }

    // Determine the base folder based on the document path
    // e.g., if documentPath is "SlimeTech/Molforte/04-test.md",
    // the directory is "SlimeTech/Molforte"
    const parsedPath = path.parse(documentPath);
    let targetDir = parsedPath.dir;
    
    // According to the prompt, we save it in the "asset" folder next to the document
    const imageDir = path.join(process.cwd(), "assets", targetDir, "asset");
    
    // Ensure the directory exists
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }

    // Generate a unique filename using timestamp
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`;
    const targetFilePath = path.join(imageDir, filename);

    // Save the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(targetFilePath, buffer);

    // Return the relative path to be inserted into the markdown
    const relativeImagePath = `./asset/${filename}`;
    
    return NextResponse.json({ 
      success: true, 
      url: relativeImagePath
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
