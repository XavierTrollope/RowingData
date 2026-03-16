import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST() {
  await destroySession();
  return NextResponse.redirect(BASE_URL);
}

export async function GET() {
  await destroySession();
  return NextResponse.redirect(BASE_URL);
}
