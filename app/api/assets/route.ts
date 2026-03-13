import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Prevent directory traversal attacks
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
  const fullPath = path.join(process.cwd(), "assets", normalizedPath);

  if (!fullPath.startsWith(path.join(process.cwd(), "assets"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    const mimeType = mime.lookup(fullPath) || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
      },
    });
  } catch (err) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
