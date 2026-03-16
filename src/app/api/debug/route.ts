import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestCookieNames = request.cookies.getAll().map((c) => c.name);
  const hasSession = request.cookies.has("session");
  const sessionLen = request.cookies.get("session")?.value?.length ?? 0;
  const hasTestCookie = request.cookies.has("debug_test");
  const testCookieValue = request.cookies.get("debug_test")?.value ?? "(not set)";

  const body = JSON.stringify(
    {
      cookies: requestCookieNames,
      hasSession,
      sessionTokenLength: sessionLen,
      hasTestCookie,
      testCookieValue,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "(not set)",
        NODE_ENV: process.env.NODE_ENV,
      },
    },
    null,
    2
  );

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "debug_test=it_works; Path=/; Max-Age=3600; SameSite=Lax",
      "Cache-Control": "no-store",
    },
  });
}
