import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "20")));
  const type = params.get("type");
  const from = params.get("from");
  const to = params.get("to");

  const where: Record<string, unknown> = { userId: session.id };

  if (type) where.workoutType = type;
  if (from || to) {
    where.workoutDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [workouts, total] = await Promise.all([
    prisma.workout.findMany({
      where,
      orderBy: { workoutDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        aiAnalysis: {
          select: { analysisJson: true },
        },
      },
    }),
    prisma.workout.count({ where }),
  ]);

  const data = workouts.map((w) => {
    const analysis = w.aiAnalysis?.analysisJson as Record<string, unknown> | null;
    return {
      id: w.id,
      workoutDate: w.workoutDate.toISOString(),
      workoutType: w.workoutType,
      description: w.description,
      distanceMeters: w.distanceMeters,
      durationSeconds: w.durationSeconds,
      avgSplitSeconds: w.avgSplitSeconds ? Number(w.avgSplitSeconds) : null,
      avgSpm: w.avgSpm ? Number(w.avgSpm) : null,
      avgWatts: w.avgWatts ? Number(w.avgWatts) : null,
      totalCalories: w.totalCalories,
      heartRateAvg: w.heartRateAvg,
      aiGrade: analysis?.overall_grade as string | null ?? null,
    };
  });

  return NextResponse.json({
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
