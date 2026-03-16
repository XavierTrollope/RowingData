import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST() {
  const response = NextResponse.redirect(BASE_URL);
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: BASE_URL.startsWith("https://"),
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(BASE_URL);
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: BASE_URL.startsWith("https://"),
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
