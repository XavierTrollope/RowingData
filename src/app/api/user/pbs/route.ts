import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pbs = await prisma.personalBest.findMany({
    where: { userId: session.id },
    orderBy: { category: "asc" },
    include: {
      workout: {
        select: {
          workoutDate: true,
          description: true,
          workoutType: true,
        },
      },
    },
  });

  return NextResponse.json(
    pbs.map((pb) => ({
      id: pb.id,
      category: pb.category,
      value: Number(pb.value),
      achievedAt: pb.achievedAt.toISOString(),
      workoutId: pb.workoutId,
      workoutDate: pb.workout.workoutDate.toISOString(),
      workoutType: pb.workout.workoutType,
    }))
  );
}
