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

  const strokes = await prisma.strokeDataPoint.findMany({
    where: { workoutId: id },
    orderBy: { strokeNumber: "asc" },
    select: {
      strokeNumber: true,
      elapsedTimeMs: true,
      strokeRate: true,
      paceSplitSecs: true,
      powerWatts: true,
      driveLengthM: true,
      driveTimeSecs: true,
      strokeDistanceM: true,
      cumulativeDistanceM: true,
      heartRate: true,
    },
  });

  return NextResponse.json(
    strokes.map((s) => ({
      strokeNumber: s.strokeNumber,
      elapsedTimeMs: s.elapsedTimeMs,
      strokeRate: s.strokeRate ? Number(s.strokeRate) : null,
      paceSplitSecs: s.paceSplitSecs ? Number(s.paceSplitSecs) : null,
      powerWatts: s.powerWatts ? Number(s.powerWatts) : null,
      driveLengthM: s.driveLengthM ? Number(s.driveLengthM) : null,
      driveTimeSecs: s.driveTimeSecs ? Number(s.driveTimeSecs) : null,
      strokeDistanceM: s.strokeDistanceM ? Number(s.strokeDistanceM) : null,
      cumulativeDistanceM: s.cumulativeDistanceM ? Number(s.cumulativeDistanceM) : null,
      heartRate: s.heartRate,
    }))
  );
}
