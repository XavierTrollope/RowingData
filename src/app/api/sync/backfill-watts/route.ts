import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret"
);

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    userId = payload.userId as string;
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      avgWatts: null,
      avgSplitSeconds: { not: null },
    },
    select: { id: true, avgSplitSeconds: true },
  });

  let updated = 0;
  for (const w of workouts) {
    const split = Number(w.avgSplitSeconds);
    if (split > 0) {
      const pacePerMeter = split / 500;
      const watts = Math.round(2.80 / Math.pow(pacePerMeter, 3));
      await prisma.workout.update({
        where: { id: w.id },
        data: { avgWatts: watts },
      });
      updated++;
    }
  }

  return NextResponse.json({ updated, total: workouts.length });
}
