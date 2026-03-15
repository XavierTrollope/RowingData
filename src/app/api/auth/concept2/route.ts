import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/concept2/client";

export async function GET() {
  const url = getAuthorizationUrl();
  return NextResponse.redirect(url);
}
