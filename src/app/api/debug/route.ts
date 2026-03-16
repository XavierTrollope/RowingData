import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestCookieNames = request.cookies.getAll().map((c) => c.name);
  const hasSession = request.cookies.has("session");
  const sessionLen = request.cookies.get("session")?.value?.length ?? 0;
  const hasTestCookie = request.cookies.has("debug_test");
  const testCookieValue = request.cookies.get("debug_test")?.value ?? "(not set)";

  const data = {
    cookies: requestCookieNames,
    hasSession,
    sessionTokenLength: sessionLen,
    hasTestCookie,
    testCookieValue,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "(not set)",
      NODE_ENV: process.env.NODE_ENV,
    },
  };

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Debug</title></head>
<body>
<script>
document.cookie = "debug_test=it_works; path=/; max-age=3600; samesite=lax";
</script>
<h2>Server sees these cookies:</h2>
<pre>${JSON.stringify(data, null, 2)}</pre>
<p><strong>Refresh this page</strong> to see if debug_test cookie appears above.</p>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
