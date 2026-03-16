import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getCurrentUser } from "@/lib/concept2/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption/tokens";
import { SignJWT } from "jose";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret"
);

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

    const token = await new SignJWT({
      userId: user.id,
      concept2Id: user.concept2Id,
      email: user.email,
      displayName: user.displayName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(SECRET);

    const maxAge = 30 * 24 * 60 * 60;
    const redirectUrl = `${BASE_URL}/dashboard`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Logging in...</title></head>
<body>
<p>Logging you in...</p>
<script>
document.cookie = "session=${token}; path=/; max-age=${maxAge}; samesite=lax";
window.location.replace("${redirectUrl}");
</script>
<noscript><a href="${redirectUrl}">Click here to continue</a></noscript>
</body></html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("OAuth callback error:", message);
    return NextResponse.redirect(
      `${BASE_URL}/?error=${encodeURIComponent(message)}`
    );
  }
}
