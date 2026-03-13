import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  uploadImageToGithub,
  GithubFeaturesError,
} from "@/lib/github-features";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const url = await uploadImageToGithub(buffer, file.name, file.type, "features/images");

    return NextResponse.json({ success: true, url });
  } catch (error) {
    if (error instanceof GithubFeaturesError) {
      if (error.code === "CONFIG_MISSING") {
        return NextResponse.json(
          { error: "GitHub upload is not configured on this server." },
          { status: 500 },
        );
      }

      if (error.code === "AUTH_FAILED") {
        return NextResponse.json(
          {
            error:
              "Upload authorization failed. Please contact an administrator.",
          },
          { status: 403 },
        );
      }

      if (error.code === "RATE_LIMITED") {
        return NextResponse.json(
          {
            error:
              "Upload service is temporarily unavailable (rate limited). Try again shortly.",
          },
          { status: 429 },
        );
      }

      if (error.code === "API_ERROR") {
        const isValidationError =
          error.message ===
            "Only image files are accepted (JPEG, PNG, GIF, WebP)." ||
          error.message === "Image exceeds maximum upload size of 10 MB.";
        if (isValidationError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json(
          { error: "Image upload failed. Please try again." },
          { status: 502 },
        );
      }
    }

    console.error("Feature upload error:", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
