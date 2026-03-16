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
    console.log("OAuth callback: exchanging code for tokens...");
    console.log("CONCEPT2_CLIENT_ID set:", !!process.env.CONCEPT2_CLIENT_ID);
    console.log("CONCEPT2_CLIENT_SECRET set:", !!process.env.CONCEPT2_CLIENT_SECRET);
    console.log("CONCEPT2_REDIRECT_URI:", process.env.CONCEPT2_REDIRECT_URI);

    const tokens = await exchangeCodeForTokens(code);
    console.log("Token exchange successful, fetching user...");

    const concept2User = await getCurrentUser(tokens.access_token);
    console.log("Got Concept2 user:", concept2User.id, concept2User.email);

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
    console.log("User upserted:", user.id);

    await createSession({
      id: user.id,
      concept2Id: user.concept2Id,
      email: user.email,
      displayName: user.displayName,
    });

    return NextResponse.redirect(`${BASE_URL}/dashboard`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("OAuth callback error:", message);
    return NextResponse.redirect(
      `${BASE_URL}/?error=${encodeURIComponent(message)}`
    );
  }
}
