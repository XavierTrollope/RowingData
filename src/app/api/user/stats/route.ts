import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalWorkouts, distanceAgg, seasonWorkouts] = await Promise.all([
    prisma.workout.count({ where: { userId: session.id } }),

    prisma.workout.aggregate({
      where: { userId: session.id },
      _sum: { distanceMeters: true },
    }),

    prisma.workout.aggregate({
      where: {
        userId: session.id,
        workoutDate: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
      _sum: { distanceMeters: true },
    }),
  ]);

  const allWorkoutDates = await prisma.workout.findMany({
    where: { userId: session.id },
    orderBy: { workoutDate: "asc" },
    select: { workoutDate: true },
  });

  let longestStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const { workoutDate } of allWorkoutDates) {
    const date = new Date(workoutDate.toDateString());
    if (lastDate) {
      const diffDays = Math.round(
        (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    lastDate = date;
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  const today = new Date(new Date().toDateString());
  const isActiveToday =
    lastDate &&
    Math.round(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    ) <= 1;

  return NextResponse.json({
    totalMeters: distanceAgg._sum.distanceMeters || 0,
    totalWorkouts,
    currentSeasonMeters: seasonWorkouts._sum.distanceMeters || 0,
    longestStreak,
    currentStreak: isActiveToday ? currentStreak : 0,
  });
}
