const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function logoutHtml() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Logging out...</title></head>
<body>
<p>Logging out...</p>
<script>
document.cookie = "session=; path=/; max-age=0; samesite=lax";
window.location.replace("${BASE_URL}");
</script>
<noscript><a href="${BASE_URL}">Click here to continue</a></noscript>
</body></html>`;
}

export async function POST() {
  return new Response(logoutHtml(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return new Response(logoutHtml(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
