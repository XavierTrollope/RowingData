import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getCurrentUser } from "@/lib/concept2/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption/tokens";
import { createSession } from "@/lib/auth";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${BASE_URL}/?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/?error=no_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const concept2User = await getCurrentUser(tokens.access_token);

    const user = await prisma.user.upsert({
      where: { concept2Id: concept2User.id },
      update: {
        email: concept2User.email,
        displayName: `${concept2User.first_name} ${concept2User.last_name}`.trim(),
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      create: {
        concept2Id: concept2User.id,
        email: concept2User.email,
        displayName: `${concept2User.first_name} ${concept2User.last_name}`.trim(),
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    await createSession({
      id: user.id,
      concept2Id: user.concept2Id,
      email: user.email,
      displayName: user.displayName,
    });

    const workoutCount = await prisma.workout.count({
      where: { userId: user.id },
    });

    if (workoutCount === 0) {
      return NextResponse.redirect(`${BASE_URL}/import`);
    }

    return NextResponse.redirect(`${BASE_URL}/dashboard`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${BASE_URL}/?error=auth_failed`);
  }
}
