import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { historicalImportQueue } from "@/lib/jobs/queues";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await historicalImportQueue.getJobs(["active", "waiting"]);
  const userJob = jobs.find((j) => j.data?.userId === session.id);

  let progress = null;
  let isImporting = false;

  if (userJob) {
    isImporting = true;
    const jobProgress = userJob.progress as Record<string, number> | undefined;
    if (jobProgress && typeof jobProgress === "object") {
      progress = {
        imported: jobProgress.imported || 0,
        total: jobProgress.total || 0,
      };
    }
  }

  const latestWorkout = await prisma.workout.findFirst({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return NextResponse.json({
    isImporting,
    progress: progress
      ? Math.round((progress.imported / Math.max(progress.total, 1)) * 100)
      : null,
    imported: progress?.imported ?? null,
    total: progress?.total ?? null,
    lastSyncAt: latestWorkout?.createdAt.toISOString() ?? null,
  });
}
