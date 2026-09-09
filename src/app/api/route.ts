import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      status: "VORTEX running",
      version: "1.0",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
