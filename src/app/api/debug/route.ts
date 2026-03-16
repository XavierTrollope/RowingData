import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestCookieNames = request.cookies.getAll().map((c) => c.name);
  const hasSessionViaRequest = request.cookies.has("session");
  const sessionLenViaRequest = request.cookies.get("session")?.value?.length ?? 0;

  let nextHeadersCookieNames: string[] = [];
  let hasSessionViaHeaders = false;
  let sessionLenViaHeaders = 0;
  try {
    const cookieStore = await cookies();
    nextHeadersCookieNames = cookieStore.getAll().map((c) => c.name);
    hasSessionViaHeaders = cookieStore.has("session");
    sessionLenViaHeaders = cookieStore.get("session")?.value?.length ?? 0;
  } catch (e) {
    nextHeadersCookieNames = [`error: ${e}`];
  }

  const rawCookieHeader = request.headers.get("cookie") ?? "(none)";

  return NextResponse.json({
    rawCookieHeader,
    requestCookies: {
      names: requestCookieNames,
      hasSession: hasSessionViaRequest,
      sessionTokenLength: sessionLenViaRequest,
    },
    nextHeadersCookies: {
      names: nextHeadersCookieNames,
      hasSession: hasSessionViaHeaders,
      sessionTokenLength: sessionLenViaHeaders,
    },
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "(not set)",
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}
