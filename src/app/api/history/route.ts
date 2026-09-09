import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getHistory } from "@/lib/db";

export async function GET(req: NextRequest | Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Valid Bearer token required in Authorization header." },
        { status: 401 }
      );
    }

    const history = await getHistory(user.userId, 50);

    return NextResponse.json({
      history,
      userId: user.userId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
