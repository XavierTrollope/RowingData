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
    include: {
      aiAnalysis: true,
    },
  });

  if (!workout) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: workout.id,
    workoutDate: workout.workoutDate.toISOString(),
    workoutType: workout.workoutType,
    description: workout.description,
    distanceMeters: workout.distanceMeters,
    durationSeconds: workout.durationSeconds,
    avgSplitSeconds: workout.avgSplitSeconds ? Number(workout.avgSplitSeconds) : null,
    avgSpm: workout.avgSpm ? Number(workout.avgSpm) : null,
    avgWatts: workout.avgWatts ? Number(workout.avgWatts) : null,
    totalCalories: workout.totalCalories,
    heartRateAvg: workout.heartRateAvg,
    heartRateMax: workout.heartRateMax,
    strokeDataParsed: workout.strokeDataParsed,
    driveToRecoveryRatio: workout.driveToRecoveryRatio ? Number(workout.driveToRecoveryRatio) : null,
    paceConsistencyStddev: workout.paceConsistencyStddev ? Number(workout.paceConsistencyStddev) : null,
    powerConsistencyStddev: workout.powerConsistencyStddev ? Number(workout.powerConsistencyStddev) : null,
    spmConsistencyStddev: workout.spmConsistencyStddev ? Number(workout.spmConsistencyStddev) : null,
    firstQuarterAvgWatts: workout.firstQuarterAvgWatts ? Number(workout.firstQuarterAvgWatts) : null,
    lastQuarterAvgWatts: workout.lastQuarterAvgWatts ? Number(workout.lastQuarterAvgWatts) : null,
    peakPowerWatts: workout.peakPowerWatts ? Number(workout.peakPowerWatts) : null,
    peakPowerStrokeNumber: workout.peakPowerStrokeNumber,
    powerCurveJson: workout.powerCurveJson,
    paceCurveJson: workout.paceCurveJson,
    aiAnalysis: workout.aiAnalysis
      ? {
          ...workout.aiAnalysis.analysisJson as Record<string, unknown>,
          modelVersion: workout.aiAnalysis.modelVersion,
          generatedAt: workout.aiAnalysis.generatedAt.toISOString(),
        }
      : null,
  });
}
