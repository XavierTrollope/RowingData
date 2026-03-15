import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
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
    select: { id: true },
  });

  if (!workout) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const analysis = await prisma.aiAnalysis.findUnique({
    where: { workoutId: id },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not available" }, { status: 404 });
  }

  return NextResponse.json({
    ...(analysis.analysisJson as Record<string, unknown>),
    modelVersion: analysis.modelVersion,
    generatedAt: analysis.generatedAt.toISOString(),
  });
}
