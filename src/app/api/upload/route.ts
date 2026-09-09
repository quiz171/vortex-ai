import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { processFile } from "@/lib/rag";
import { saveMaterial } from "@/lib/db";

const MAX_FILE_SIZE = 120 * 1024 * 1024; // 120MB
const BLOCKED_EXTENSIONS = [".exe", ".sh", ".bat", ".bin", ".cmd", ".vbs", ".msi", ".dll", ".so"];

export async function POST(req: NextRequest | Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Valid Bearer token required in Authorization header." },
        { status: 401 }
      );
    }

    const formData = await (req as any).formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob || typeof (file as any).arrayBuffer === "function")) {
      return NextResponse.json(
        { error: "No file provided under form field 'file'" },
        { status: 400 }
      );
    }

    const fileName = (file as any).name || "document.txt";
    const fileSize = file.size;

    // Check size limit (120MB)
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 120MB limit. Current size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Check blocked extensions
    const lowerName = fileName.toLowerCase();
    for (const ext of BLOCKED_EXTENSIONS) {
      if (lowerName.endsWith(ext)) {
        return NextResponse.json(
          { error: `Security restriction: File extension ${ext} is blocked.` },
          { status: 400 }
        );
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process file
    const { text, chunks } = await processFile(buffer, fileName);

    // Save material record in background
    try {
      await saveMaterial(user.userId, fileName, chunks.length);
    } catch (err) {
      console.warn("saveMaterial error:", err);
    }

    return NextResponse.json({
      fileName,
      chunksCreated: chunks.length,
      textPreview: text.slice(0, 500),
      totalCharacters: text.length,
      message: "File successfully parsed and indexed into Second Brain memory",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
