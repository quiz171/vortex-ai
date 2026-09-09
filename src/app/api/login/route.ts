import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createToken } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db";

export async function POST(req: NextRequest | Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      educationLevel: user.educationLevel,
      classYear: user.classYear,
      course: user.course,
    };

    const tokens = await createToken(tokenPayload);

    const safeUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      educationLevel: user.educationLevel,
      classYear: user.classYear,
      course: user.course,
    };

    return NextResponse.json({
      user: safeUser,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
