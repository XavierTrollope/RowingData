import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getCurrentUser } from "@/lib/concept2/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption/tokens";
import { createSession } from "@/lib/auth";
import { historicalImportQueue } from "@/lib/jobs/queues";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
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
      await historicalImportQueue.add("import", {
        userId: user.id,
        concept2UserId: user.concept2Id,
      });
      return NextResponse.redirect(new URL("/import", request.url));
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
