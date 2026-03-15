import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { analyseWorkoutQueue } from "@/lib/jobs/queues";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const workout = await prisma.workout.findFirst({
    where: { id, userId: session.id },
  });

  if (!workout) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!workout.strokeDataParsed) {
    return NextResponse.json(
      { error: "Stroke data must be parsed before analysis" },
      { status: 400 }
    );
  }

  await analyseWorkoutQueue.add("reanalyse", { workoutId: id });

  return NextResponse.json({ status: "queued" });
}
