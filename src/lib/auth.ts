import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret"
);

export interface SessionUser {
  id: string;
  concept2Id: number;
  email: string | null;
  displayName: string | null;
}

export async function createSession(user: SessionUser): Promise<string> {
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

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.userId as string,
      concept2Id: payload.concept2Id as number,
      email: (payload.email as string) || null,
      displayName: (payload.displayName as string) || null,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
