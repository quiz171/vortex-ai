import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkLimit } from "@/lib/rate-limiter";
import { getHistory, saveChat } from "@/lib/db";
import { getRelevantChunks, globalChunks } from "@/lib/rag";
import { vortexBrain } from "@/lib/vortex-ai";

export async function POST(req: NextRequest | Request) {
  try {
    // 1. Verify Authentication Token
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Valid Bearer token required in Authorization header." },
        { status: 401 }
      );
    }

    // 2. Check Rate Limit
    const limitStatus = checkLimit(user.userId);
    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          error: "Daily rate limit exceeded (50/day free, 200/day dev/premium). Limit resets at midnight.",
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      message,
      image,
      educationLevel,
      classYear,
      course,
      history: clientHistory,
      ragContext: clientRagContext,
    } = body;

    const hasMessage = Boolean(message && typeof message === "string" && message.trim().length > 0);
    const hasImage = Boolean(image && image.data && typeof image.data === "string");

    if (!hasMessage && !hasImage) {
      return NextResponse.json(
        { error: "A question message or an attached past question photo is required." },
        { status: 400 }
      );
    }

    const safeMessage = hasMessage
      ? message.trim()
      : "Please transcribe and solve this exam past question photo step-by-step with complete formulas, working, and answers.";

    // 3. Retrieve DB History or provided History
    const dbHistory = await getHistory(user.userId, 10);
    const history = (clientHistory && clientHistory.length > 0) ? clientHistory : dbHistory;

    // 4. Retrieve RAG Relevant Chunks
    const relevantChunks = getRelevantChunks(safeMessage, globalChunks, 5);
    const ragContext = clientRagContext || (relevantChunks.length > 0 ? relevantChunks.join("\n---\n") : "");

    // 5. Call VORTEX Brain
    const finalEducationLevel = educationLevel || user.educationLevel || "University";
    const finalClassYear = classYear || user.classYear || "Year 1";
    const finalCourse = course || user.course || "General";

    let aiText = "";
    try {
      aiText = await vortexBrain({
        message: safeMessage,
        educationLevel: finalEducationLevel,
        classYear: finalClassYear,
        course: finalCourse,
        ragContext,
        history,
        image: hasImage ? image : undefined,
      });
    } catch (aiErr: any) {
      console.error("vortexBrain error:", aiErr);
      return NextResponse.json(
        { error: aiErr?.message || "Failed to generate AI response" },
        { status: 500 }
      );
    }

    // 6. Save chat message & response non-blockingly
    (async () => {
      try {
        await saveChat(user.userId, "user", safeMessage);
        await saveChat(user.userId, "assistant", aiText);
      } catch (err) {
        console.warn("Non-blocking saveChat error:", err);
      }
    })();

    // 7. Return payload
    return NextResponse.json({
      response: aiText,
      sources: relevantChunks,
      remaining: limitStatus.remaining,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
