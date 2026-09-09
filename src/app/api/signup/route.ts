import { NextRequest, NextResponse } from "next/server";
import { hashPassword, createToken } from "@/lib/auth";
import { saveUser, getUserByEmail } from "@/lib/db";

export async function POST(req: NextRequest | Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fullName, email, password, educationLevel, classYear, course } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = "usr_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

    const newUser = await saveUser({
      id: userId,
      fullName: fullName || "",
      email: email.toLowerCase().trim(),
      passwordHash,
      educationLevel: educationLevel || "University",
      classYear: classYear || "Year 1",
      course: course || "General",
      createdAt: new Date().toISOString(),
    });

    const tokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      educationLevel: newUser.educationLevel,
      classYear: newUser.classYear,
      course: newUser.course,
    };

    const tokens = await createToken(tokenPayload);

    // Sanitize user output without passwordHash
    const safeUser = {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      educationLevel: newUser.educationLevel,
      classYear: newUser.classYear,
      course: newUser.course,
    };

    return NextResponse.json({
      user: safeUser,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      message: "Welcome to your Second Brain",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
