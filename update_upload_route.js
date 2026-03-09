const fs = require('fs');
const content = \import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import COS from "cos-nodejs-sdk-v5";
import path from "path";

// Initialize COS client
// Ensure these environment variables are set in your .env
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID || "",
  SecretKey: process.env.COS_SECRET_KEY || "",
});

const BUCKET = process.env.COS_BUCKET;
const REGION = process.env.COS_REGION;
const DOMAIN = process.env.COS_DOMAIN; // Optional: Custom CDN Domain

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const documentPath = formData.get("filePath");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    // Check Config
    if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY || !BUCKET || !REGION) {
       console.error("Missing COS configuration");
       return NextResponse.json({ error: "Server configuration error: COS credentials missing" }, { status: 500 });
    }
    
    // Construct local path simulation
    // assets/SlimeTech/Molforte/timestamp-random.png
    const parsedPath = { dir: "" };
    if (documentPath && typeof documentPath === 'string') {
        const p = path.parse(documentPath);
        parsedPath.dir = p.dir;
    }
    const safeDir = (parsedPath.dir || "").replace(/\\\\/g, "/").replace(/^\\/+|\\/+$/g, "");
    
    const ext = file.name.split('.').pop() || "bin";
    const filename = \\-\.\\;
    
    // COS Key
    const key = \ssets/\asset/\\;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Tencent Cloud COS
    const data = await new Promise((resolve, reject) => {
        cos.putObject({
            Bucket: BUCKET,
            Region: REGION,
            Key: key,
            Body: buffer,
        }, function(err, data) {
            if(err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });

    // Build Public URL
    let fileUrl = "";
    if (DOMAIN) {
        const domainPrefix = DOMAIN.startsWith("http") ? DOMAIN : \https://\\;
        fileUrl = \\/\\;
    } else {
        fileUrl = \https://\\; 
    }

    if (!fileUrl.startsWith("http")) {
       fileUrl = "https://" + fileUrl;
    }

    return NextResponse.json({
      success: true,
      url: fileUrl
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed: " + (error.message || String(error)) }, { status: 500 });
  }
}
\;

fs.writeFileSync('app/api/upload/route.ts', content);
console.log('Updated app/api/upload/route.ts');
